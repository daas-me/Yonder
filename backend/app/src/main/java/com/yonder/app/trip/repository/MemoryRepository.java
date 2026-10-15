package com.yonder.app.trip.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.yonder.app.trip.entity.MemoryEntity;

public interface MemoryRepository extends JpaRepository<MemoryEntity, String> {
    List<MemoryEntity> findAllByTrip_IdOrderByCreatedAtAsc(String tripId);
    java.util.Optional<MemoryEntity> findByIdAndTrip_Id(String id, String tripId);
    void deleteAllByTrip_Id(String tripId);
}
