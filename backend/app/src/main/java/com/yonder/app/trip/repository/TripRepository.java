package com.yonder.app.trip.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.yonder.app.trip.entity.TripEntity;

public interface TripRepository extends JpaRepository<TripEntity, String> {
    List<TripEntity> findAllByUser_EmailIgnoreCaseOrderByStartDateAsc(String email);
    Optional<TripEntity> findByIdAndUser_EmailIgnoreCase(String id, String email);
}
