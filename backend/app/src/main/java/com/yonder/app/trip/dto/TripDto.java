package com.yonder.app.trip.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TripDto(
        @NotBlank String id,
        String ownerId,
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 120) String destination,
        @NotNull LocalDate start,
        @NotNull LocalDate end,
        @Size(max = 1000) String description,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal budget,
        @Valid List<@Valid CheckDto> checklist,
        @Valid GeoDto geo,
        @Valid List<@Valid MemoryDto> memories,
        @Valid List<@Valid ExtraDto> extras,
        @Size(max = 32) String color,
        @Size(max = 2048) String cover,
        @Size(max = 160) String tagline,
        @Valid List<@Valid ActivityDto> activities) {
}
