package com.yonder.app.places.dto;

import java.util.List;

public record PlaceDto(
        String id,
        String name,
        String kind,
        String type,
        String source,
        List<String> amenities,
        String description,
        String address,
        String hours,
        String phone,
        String url,
        Double lat,
        Double lon,
        Double rating,
        Integer reviewCount) {
}
