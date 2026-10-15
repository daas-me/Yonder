package com.yonder.app.trip.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "trip_extras")
public class ExtraEntity {
    @Id
    private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private TripEntity trip;
    @Column(nullable = false, length = 120)
    private String label;
    @Column(nullable = false, length = 24)
    private String category;
    @Column(name = "estimated_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedCost;
    @Column(name = "actual_cost", precision = 12, scale = 2)
    private BigDecimal actualCost;

    public ExtraEntity() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public TripEntity getTrip() { return trip; }
    public void setTrip(TripEntity trip) { this.trip = trip; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getEstimatedCost() { return estimatedCost; }
    public void setEstimatedCost(BigDecimal estimatedCost) { this.estimatedCost = estimatedCost; }
    public BigDecimal getActualCost() { return actualCost; }
    public void setActualCost(BigDecimal actualCost) { this.actualCost = actualCost; }
}
