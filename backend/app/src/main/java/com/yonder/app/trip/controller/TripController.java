package com.yonder.app.trip.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import com.yonder.app.trip.dto.TripDto;
import com.yonder.app.trip.service.TripService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/trips")
public class TripController {
    private final TripService trips;

    public TripController(TripService trips) {
        this.trips = trips;
    }

    @GetMapping
    List<TripDto> list(Authentication authentication) {
        return trips.list(authentication.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    TripDto create(Authentication authentication, @Valid @RequestBody TripDto request) {
        return trips.create(authentication.getName(), request);
    }

    @GetMapping("/{id}")
    TripDto get(Authentication authentication, @PathVariable String id) {
        return trips.get(authentication.getName(), id);
    }

    @PutMapping("/{id}")
    TripDto update(Authentication authentication, @PathVariable String id, @Valid @RequestBody TripDto request) {
        return trips.update(authentication.getName(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(Authentication authentication, @PathVariable String id) {
        trips.delete(authentication.getName(), id);
    }

    @PutMapping(value = "/{id}/photos/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    Map<String, String> uploadTripCover(
            Authentication authentication, @PathVariable String id, @RequestParam("file") MultipartFile file) {
        return Map.of("url", trips.uploadTripCover(authentication.getName(), id, file));
    }

    @GetMapping("/{id}/photos/cover")
    ResponseEntity<byte[]> getTripCover(Authentication authentication, @PathVariable String id) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG)
                .body(trips.getTripCover(authentication.getName(), id));
    }

    @PutMapping(value = "/{id}/photos/memories/{memoryId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    Map<String, String> uploadMemoryPhoto(
            Authentication authentication, @PathVariable String id, @PathVariable String memoryId,
            @RequestParam("file") MultipartFile file) {
        return Map.of("url", trips.uploadMemoryPhoto(authentication.getName(), id, memoryId, file));
    }

    @DeleteMapping("/{id}/photos/memories/{memoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteMemoryPhoto(Authentication authentication, @PathVariable String id, @PathVariable String memoryId) {
        trips.deleteMemoryPhoto(authentication.getName(), id, memoryId);
    }

    @GetMapping("/{id}/photos/memories/{memoryId}")
    ResponseEntity<byte[]> getMemoryPhoto(Authentication authentication, @PathVariable String id, @PathVariable String memoryId) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG)
                .body(trips.getMemoryPhoto(authentication.getName(), id, memoryId));
    }

    @PutMapping(value = "/{id}/photos/activities/{activityId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    Map<String, String> uploadActivityPhoto(
            Authentication authentication, @PathVariable String id, @PathVariable String activityId,
            @RequestParam("file") MultipartFile file) {
        return Map.of("url", trips.uploadActivityPhoto(authentication.getName(), id, activityId, file));
    }

    @DeleteMapping("/{id}/photos/activities/{activityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteActivityPhoto(Authentication authentication, @PathVariable String id, @PathVariable String activityId) {
        trips.deleteActivityPhoto(authentication.getName(), id, activityId);
    }

    @GetMapping("/{id}/photos/activities/{activityId}")
    ResponseEntity<byte[]> getActivityPhoto(Authentication authentication, @PathVariable String id, @PathVariable String activityId) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG)
                .body(trips.getActivityPhoto(authentication.getName(), id, activityId));
    }
}
