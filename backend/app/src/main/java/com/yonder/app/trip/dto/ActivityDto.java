package com.yonder.app.trip.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ActivityDto(
        @NotBlank String id,
        @Size(max = 24) String category,
        @NotBlank @Size(max = 120) String title,
        @NotNull LocalDate date,
        @NotNull LocalTime time,
        @Size(max = 160) String location,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal cost,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal actual,
        @Pattern(regexp = "ontime|delayed|cancelled") String status,
        @Size(max = 1000) String notes,
        @Size(max = 2048) String image,
        Double lat,
        Double lon,
        @Valid List<@Valid MemoryDto> memories) {
}
