package com.yonder.app.trip.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.yonder.app.trip.dto.TripDto;
import com.yonder.app.trip.service.TripShareService;

@RestController
@RequestMapping("/api")
public class TripShareController {
    private final TripShareService shares;

    public TripShareController(TripShareService shares) {
        this.shares = shares;
    }

    @PostMapping("/trips/{tripId}/share")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> create(Authentication authentication, @PathVariable String tripId) {
        TripShareService.CreatedShare share = shares.create(authentication.getName(), tripId);
        return Map.of("token", share.token(), "expiresAt", share.expiresAt());
    }

    @DeleteMapping("/trips/{tripId}/shares")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void revokeAll(Authentication authentication, @PathVariable String tripId) {
        shares.revokeAll(authentication.getName(), tripId);
    }

    @GetMapping("/shared/{token}")
    TripDto get(@PathVariable String token) {
        return shares.getSharedTrip(token);
    }

    @GetMapping("/shared/{token}/photos/memories/{memoryId}")
    ResponseEntity<byte[]> memoryPhoto(@PathVariable String token, @PathVariable String memoryId) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(shares.getSharedMemoryPhoto(token, memoryId));
    }

    @GetMapping("/shared/{token}/photos/activities/{activityId}")
    ResponseEntity<byte[]> activityPhoto(@PathVariable String token, @PathVariable String activityId) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(shares.getSharedActivityPhoto(token, activityId));
    }

    @GetMapping("/shared/{token}/photos/cover")
    ResponseEntity<byte[]> tripCover(@PathVariable String token) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(shares.getSharedTripCover(token));
    }
}
