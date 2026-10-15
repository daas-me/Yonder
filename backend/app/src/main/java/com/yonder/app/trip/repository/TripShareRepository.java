package com.yonder.app.trip.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.yonder.app.trip.entity.TripShareEntity;

public interface TripShareRepository extends JpaRepository<TripShareEntity, String> {
    Optional<TripShareEntity> findByTokenHashAndRevokedAtIsNull(String tokenHash);
    List<TripShareEntity> findAllByTripIdAndRevokedAtIsNull(String tripId);
}
