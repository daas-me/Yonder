package com.yonder.app.places.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.yonder.app.places.dto.PlaceDto;
import com.yonder.app.places.service.GooglePlacesService;

@RestController
@RequestMapping("/api/discover")
public class DiscoverController {
    private final GooglePlacesService places;

    public DiscoverController(GooglePlacesService places) {
        this.places = places;
    }

    @GetMapping("/places")
    List<PlaceDto> nearby(@RequestParam double lat, @RequestParam double lon) {
        if (!Double.isFinite(lat) || lat < -90 || lat > 90 || !Double.isFinite(lon) || lon < -180 || lon > 180) {
            throw new IllegalArgumentException("Coordinates must be valid latitude and longitude values");
        }
        return places.nearby(lat, lon);
    }
}
