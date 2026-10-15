package com.yonder.app.trip.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "activities")
public class ActivityEntity {
    @Id
    private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private TripEntity trip;
    @Column(length = 24)
    private String category;
    @Column(nullable = false, length = 120)
    private String title;
    @Column(name = "activity_date", nullable = false)
    private LocalDate date;
    @Column(name = "start_time", nullable = false)
    private LocalTime time;
    @Column(nullable = false, length = 160)
    private String location = "";
    @Column(name = "estimated_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal cost;
    @Column(name = "actual_cost", precision = 12, scale = 2)
    private BigDecimal actual;
    @Column(length = 16)
    private String status;
    @Column(nullable = false, length = 1000)
    private String notes = "";
    @Column(name = "image_url", length = 2048)
    private String image;
    private Double latitude;
    private Double longitude;

    public ActivityEntity() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public TripEntity getTrip() { return trip; }
    public void setTrip(TripEntity trip) { this.trip = trip; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public LocalTime getTime() { return time; }
    public void setTime(LocalTime time) { this.time = time; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }
    public BigDecimal getActual() { return actual; }
    public void setActual(BigDecimal actual) { this.actual = actual; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
}
