package com.yonder.app.places.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class GooglePlacesServiceTests {
    @Test
    void nearbyMapsGooglePlaceDetailsAndKeepsApiKeyOnServerRequest() {
        RestClient.Builder restClientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restClientBuilder).build();
        GooglePlacesService places = new GooglePlacesService(restClientBuilder.build(), "server-only-key");
        server.expect(requestTo("https://places.googleapis.com/v1/places:searchNearby"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Goog-Api-Key", "server-only-key"))
                .andRespond(withSuccess("""
                        {
                          "places": [{
                            "id": "place-id",
                            "displayName": {"text": "Yonder Cafe"},
                            "primaryType": "cafe",
                            "primaryTypeDisplayName": {"text": "Cafe"},
                            "types": ["cafe", "restaurant"],
                            "formattedAddress": "Baguio City",
                            "location": {"latitude": 16.4, "longitude": 120.6},
                            "rating": 4.6,
                            "userRatingCount": 128
                          }]
                        }
                        """, MediaType.APPLICATION_JSON));

        var result = places.nearby(16.4, 120.6);

        assertThat(result).singleElement().satisfies(place -> {
            assertThat(place.name()).isEqualTo("Yonder Cafe");
            assertThat(place.kind()).isEqualTo("eat");
            assertThat(place.source()).isEqualTo("Google Places");
            assertThat(place.rating()).isEqualTo(4.6);
            assertThat(place.reviewCount()).isEqualTo(128);
            assertThat(place.lat()).isEqualTo(16.4);
            assertThat(place.lon()).isEqualTo(120.6);
        });
        server.verify();
    }

    @Test
    void nearbyFailsExplicitlyWhenPlacesKeyIsNotConfigured() {
        GooglePlacesService places = new GooglePlacesService(RestClient.create(), "");

        assertThatThrownBy(() -> places.nearby(16.4, 120.6))
                .isInstanceOf(PlacesUnavailableException.class)
                .hasMessageContaining("not configured");
    }
}
