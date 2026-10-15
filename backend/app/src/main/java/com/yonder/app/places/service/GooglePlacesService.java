package com.yonder.app.places.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.yonder.app.places.dto.PlaceDto;
import tools.jackson.databind.JsonNode;

@Service
public class GooglePlacesService {
    private static final String SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby";
    private static final String FIELD_MASK = String.join(",",
            "places.id",
            "places.displayName",
            "places.primaryType",
            "places.primaryTypeDisplayName",
            "places.types",
            "places.formattedAddress",
            "places.location",
            "places.nationalPhoneNumber",
            "places.websiteUri",
            "places.rating",
            "places.userRatingCount",
            "places.editorialSummary",
            "places.regularOpeningHours.weekdayDescriptions");
    private static final List<String> INCLUDED_TYPES = List.of(
            "lodging", "restaurant", "cafe", "bar", "tourist_attraction",
            "museum", "park", "shopping_mall", "bus_station", "airport", "travel_agency");
    private static final Set<String> GENERIC_TYPES = Set.of(
            "establishment", "point_of_interest", "food", "political", "locality", "premise", "route");

    private final RestClient restClient;
    private final String apiKey;

    public GooglePlacesService(
            RestClient restClient,
            @Value("${yonder.google.places-api-key:}") String apiKey) {
        this.restClient = restClient;
        this.apiKey = apiKey;
    }

    public List<PlaceDto> nearby(double lat, double lon) {
        if (apiKey.isBlank()) {
            throw new PlacesUnavailableException("Google Places is not configured on the server");
        }

        Map<String, Object> request = Map.of(
                "includedTypes", INCLUDED_TYPES,
                "maxResultCount", 20,
                "rankPreference", "DISTANCE",
                "locationRestriction", Map.of(
                        "circle", Map.of(
                                "center", Map.of("latitude", lat, "longitude", lon),
                                "radius", 6000.0)));

        try {
            JsonNode response = restClient.post()
                    .uri(SEARCH_URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask", FIELD_MASK)
                    .body(request)
                    .retrieve()
                    .body(JsonNode.class);

            return parsePlaces(response);
        } catch (RestClientException exception) {
            throw new PlacesUnavailableException("Google Places could not be reached", exception);
        }
    }

    private List<PlaceDto> parsePlaces(JsonNode response) {
        List<PlaceDto> places = new ArrayList<>();
        if (response == null || !response.path("places").isArray()) {
            return places;
        }

        for (JsonNode place : response.path("places")) {
            String name = text(place, "displayName", "text");
            if (name == null || name.isBlank()) {
                continue;
            }

            String primaryType = text(place, "primaryType");
            String displayType = text(place, "primaryTypeDisplayName", "text");
            String type = displayType != null ? displayType : humanize(primaryType);
            JsonNode location = place.path("location");
            JsonNode rating = place.path("rating");
            JsonNode reviewCount = place.path("userRatingCount");
            places.add(new PlaceDto(
                    text(place, "id"),
                    name,
                    kind(primaryType, place.path("types")),
                    type == null ? "Place" : type,
                    "Google Places",
                    amenities(place.path("types")),
                    text(place, "editorialSummary", "text"),
                    text(place, "formattedAddress"),
                    hours(place.path("regularOpeningHours").path("weekdayDescriptions")),
                    text(place, "nationalPhoneNumber"),
                    text(place, "websiteUri"),
                    number(location, "latitude"),
                    number(location, "longitude"),
                    rating.isNumber() ? rating.doubleValue() : null,
                    reviewCount.isIntegralNumber() ? reviewCount.intValue() : null));
        }
        return places;
    }

    private String kind(String primaryType, JsonNode types) {
        if (hasType(primaryType, types, "lodging")) {
            return "stay";
        }
        if (hasAnyType(primaryType, types, "restaurant", "cafe", "bar", "meal_takeaway", "meal_delivery")) {
            return "eat";
        }
        if (hasAnyType(primaryType, types, "shopping_mall", "store", "department_store")) {
            return "shop";
        }
        if (hasAnyType(primaryType, types, "airport", "bus_station", "train_station", "transit_station")) {
            return "transport";
        }
        return "tour";
    }

    private boolean hasAnyType(String primaryType, JsonNode types, String... expectedTypes) {
        for (String expectedType : expectedTypes) {
            if (hasType(primaryType, types, expectedType)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasType(String primaryType, JsonNode types, String expectedType) {
        if (expectedType.equals(primaryType)) {
            return true;
        }
        if (types != null && types.isArray()) {
            for (JsonNode type : types) {
                if (expectedType.equals(type.asText())) {
                    return true;
                }
            }
        }
        return false;
    }

    private List<String> amenities(JsonNode types) {
        List<String> amenities = new ArrayList<>();
        if (types != null && types.isArray()) {
            for (JsonNode type : types) {
                String rawType = type.asText();
                String label = humanize(rawType);
                if (!GENERIC_TYPES.contains(rawType) && label != null && !label.isBlank() && amenities.size() < 6) {
                    amenities.add(label);
                }
            }
        }
        return amenities;
    }

    private String hours(JsonNode weekdayDescriptions) {
        if (weekdayDescriptions == null || !weekdayDescriptions.isArray()) {
            return null;
        }
        List<String> descriptions = new ArrayList<>();
        weekdayDescriptions.forEach(value -> descriptions.add(value.asText()));
        return descriptions.isEmpty() ? null : String.join(" · ", descriptions);
    }

    private Double number(JsonNode parent, String field) {
        JsonNode value = parent.path(field);
        return value.isNumber() ? value.doubleValue() : null;
    }

    private String text(JsonNode parent, String... path) {
        JsonNode value = parent;
        for (String field : path) {
            value = value.path(field);
        }
        return value.isTextual() ? value.asText() : null;
    }

    private String humanize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String[] words = value.replace('_', ' ').split(" ");
        StringBuilder label = new StringBuilder();
        for (String word : words) {
            if (word.isBlank()) {
                continue;
            }
            if (!label.isEmpty()) {
                label.append(' ');
            }
            label.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return label.toString();
    }
}
