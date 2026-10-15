package com.yonder.app.trip.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ExtraDto(
        @NotBlank String id,
        @NotBlank @Size(max = 120) String label,
        @NotBlank @Size(max = 24) String category,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal est,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal actual) {
}
