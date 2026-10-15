package com.yonder.app.trip.service;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yonder.app.common.ResourceNotFoundException;
import com.yonder.app.trip.dto.TripDto;
import com.yonder.app.trip.entity.TripShareEntity;
import com.yonder.app.trip.repository.TripShareRepository;

@Service
public class TripShareService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final TripShareRepository shares;
    private final TripService trips;

    public TripShareService(TripShareRepository shares, TripService trips) {
        this.shares = shares;
        this.trips = trips;
    }

    @Transactional
    public CreatedShare create(String email, String tripId) {
        trips.get(email, tripId);
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = Instant.now();
        TripShareEntity share = new TripShareEntity();
        share.setId(UUID.randomUUID().toString());
        share.setTripId(tripId);
        share.setTokenHash(hash(token));
        share.setCreatedAt(now);
        share.setExpiresAt(now.plus(30, ChronoUnit.DAYS));
        shares.save(share);
        return new CreatedShare(token, share.getExpiresAt());
    }

    @Transactional
    public void revokeAll(String email, String tripId) {
        trips.get(email, tripId);
        Instant now = Instant.now();
        shares.findAllByTripIdAndRevokedAtIsNull(tripId).forEach(share -> share.setRevokedAt(now));
    }

    @Transactional(readOnly = true)
    public TripDto getSharedTrip(String token) {
        TripShareEntity share = requireActive(token);
        return trips.getForShare(share.getTripId(), token);
    }

    @Transactional(readOnly = true)
    public byte[] getSharedMemoryPhoto(String token, String memoryId) {
        return trips.getSharedMemoryPhoto(requireActive(token).getTripId(), memoryId);
    }

    @Transactional(readOnly = true)
    public byte[] getSharedActivityPhoto(String token, String activityId) {
        return trips.getSharedActivityPhoto(requireActive(token).getTripId(), activityId);
    }

    @Transactional(readOnly = true)
    public byte[] getSharedTripCover(String token) {
        return trips.getSharedTripCover(requireActive(token).getTripId());
    }

    private TripShareEntity requireActive(String token) {
        TripShareEntity share = shares.findByTokenHashAndRevokedAtIsNull(hash(token))
                .orElseThrow(() -> new ResourceNotFoundException("Share link not found or expired"));
        if (!share.getExpiresAt().isAfter(Instant.now())) {
            throw new ResourceNotFoundException("Share link not found or expired");
        }
        return share;
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    public record CreatedShare(String token, Instant expiresAt) {
    }
}
