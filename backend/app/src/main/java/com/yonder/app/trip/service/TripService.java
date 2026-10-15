package com.yonder.app.trip.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.yonder.app.auth.entity.UserEntity;
import com.yonder.app.auth.repository.UserRepository;
import com.yonder.app.common.ResourceNotFoundException;
import com.yonder.app.trip.dto.ActivityDto;
import com.yonder.app.trip.dto.CheckDto;
import com.yonder.app.trip.dto.ExtraDto;
import com.yonder.app.trip.dto.GeoDto;
import com.yonder.app.trip.dto.MemoryDto;
import com.yonder.app.trip.dto.TripDto;
import com.yonder.app.trip.entity.ActivityEntity;
import com.yonder.app.trip.entity.ChecklistEntity;
import com.yonder.app.trip.entity.ExtraEntity;
import com.yonder.app.trip.entity.MemoryEntity;
import com.yonder.app.trip.entity.TripEntity;
import com.yonder.app.trip.repository.MemoryRepository;
import com.yonder.app.trip.repository.TripRepository;

@Service
public class TripService {
    private final TripRepository trips;
    private final MemoryRepository memories;
    private final UserRepository users;
    private final PhotoStorageService photos;

    public TripService(TripRepository trips, MemoryRepository memories, UserRepository users, PhotoStorageService photos) {
        this.trips = trips;
        this.memories = memories;
        this.users = users;
        this.photos = photos;
    }

    @Transactional(readOnly = true)
    public List<TripDto> list(String email) {
        return trips.findAllByUser_EmailIgnoreCaseOrderByStartDateAsc(email).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public TripDto get(String email, String id) {
        return toDto(requireOwned(email, id));
    }

    @Transactional(readOnly = true)
    public TripDto getForShare(String id, String token) {
        TripDto trip = toDto(trips.findById(id).orElseThrow(() -> new ResourceNotFoundException("Trip not found")));
        List<MemoryDto> sharedMemories = trip.memories().stream()
                .map(memory -> withPhotoUrl(memory, "/api/shared/" + token + "/photos/memories/" + memory.id()))
                .toList();
        List<ActivityDto> sharedActivities = trip.activities().stream()
                .map(activity -> new ActivityDto(
                        activity.id(), activity.category(), activity.title(), activity.date(), activity.time(),
                        activity.location(), activity.cost(), activity.actual(), activity.status(), activity.notes(),
                        activity.image() != null && activity.image().startsWith(
                                "/api/trips/" + trip.id() + "/photos/activities/")
                                        ? "/api/shared/" + token + "/photos/activities/" + activity.id()
                                        : activity.image(),
                        activity.lat(), activity.lon(), activity.memories().stream()
                                .map(memory -> withPhotoUrl(memory, "/api/shared/" + token + "/photos/memories/" + memory.id()))
                                .toList()))
                .toList();
        String sharedCover = trip.cover();
        if (sharedCover != null && sharedCover.equals("/api/trips/" + trip.id() + "/photos/cover")) {
            sharedCover = "/api/shared/" + token + "/photos/cover";
        } else if (sharedCover != null) {
            for (ActivityDto activity : trip.activities()) {
                if (sharedCover.equals(activity.image())) {
                    sharedCover = "/api/shared/" + token + "/photos/activities/" + activity.id();
                    break;
                }
            }
        }
        return new TripDto(
                trip.id(), "", trip.name(), trip.destination(), trip.start(), trip.end(), trip.description(),
                trip.budget(), trip.checklist(), trip.geo(), sharedMemories, trip.extras(), trip.color(), sharedCover,
                trip.tagline(), sharedActivities);
    }

    @Transactional
    public String uploadMemoryPhoto(String email, String tripId, String memoryId, MultipartFile file) {
        requireOwned(email, tripId);
        MemoryEntity memory = memories.findByIdAndTrip_Id(memoryId, tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found"));
        String oldKey = memory.getFileUrl();
        String key = photos.store(file);
        memory.setFileUrl(key);
        deletePhotoAfterCommit(oldKey);
        return "/api/trips/" + tripId + "/photos/memories/" + memoryId;
    }

    @Transactional
    public void deleteMemoryPhoto(String email, String tripId, String memoryId) {
        requireOwned(email, tripId);
        MemoryEntity memory = memories.findByIdAndTrip_Id(memoryId, tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found"));
        String key = memory.getFileUrl();
        memory.setFileUrl(null);
        deletePhotoAfterCommit(key);
    }

    @Transactional
    public String uploadActivityPhoto(String email, String tripId, String activityId, MultipartFile file) {
        TripEntity trip = requireOwned(email, tripId);
        ActivityEntity activity = trip.getActivities().stream()
                .filter(candidate -> candidate.getId().equals(activityId))
                .findFirst().orElseThrow(() -> new ResourceNotFoundException("Activity not found"));
        String oldKey = activity.getImage();
        String key = photos.store(file);
        activity.setImage(key);
        deletePhotoAfterCommit(oldKey);
        return "/api/trips/" + tripId + "/photos/activities/" + activityId;
    }

    @Transactional
    public void deleteActivityPhoto(String email, String tripId, String activityId) {
        TripEntity trip = requireOwned(email, tripId);
        ActivityEntity activity = trip.getActivities().stream()
                .filter(candidate -> candidate.getId().equals(activityId))
                .findFirst().orElseThrow(() -> new ResourceNotFoundException("Activity not found"));
        String key = activity.getImage();
        activity.setImage(null);
        deletePhotoAfterCommit(key);
    }

    @Transactional(readOnly = true)
    public byte[] getMemoryPhoto(String email, String tripId, String memoryId) {
        requireOwned(email, tripId);
        return memories.findByIdAndTrip_Id(memoryId, tripId)
                .map(MemoryEntity::getFileUrl).map(photos::read)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
    }

    @Transactional(readOnly = true)
    public byte[] getActivityPhoto(String email, String tripId, String activityId) {
        TripEntity trip = trips.findByIdAndUser_EmailIgnoreCase(tripId, email)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
        return trip.getActivities().stream()
                .filter(activity -> activity.getId().equals(activityId))
                .map(ActivityEntity::getImage).map(photos::read)
                .findFirst().orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
    }

    @Transactional(readOnly = true)
    public byte[] getSharedMemoryPhoto(String tripId, String memoryId) {
        return memories.findByIdAndTrip_Id(memoryId, tripId)
                .map(MemoryEntity::getFileUrl).map(photos::read)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
    }

    @Transactional(readOnly = true)
    public byte[] getSharedActivityPhoto(String tripId, String activityId) {
        TripEntity trip = trips.findById(tripId).orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
        return trip.getActivities().stream()
                .filter(activity -> activity.getId().equals(activityId))
                .map(ActivityEntity::getImage).map(photos::read)
                .findFirst().orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
    }

    @Transactional
    public String uploadTripCover(String email, String tripId, MultipartFile file) {
        TripEntity trip = requireOwned(email, tripId);
        String oldKey = trip.getCover();
        trip.setCover(photos.store(file));
        deletePhotoAfterCommit(oldKey);
        return "/api/trips/" + tripId + "/photos/cover";
    }

    @Transactional(readOnly = true)
    public byte[] getTripCover(String email, String tripId) {
        TripEntity trip = trips.findByIdAndUser_EmailIgnoreCase(tripId, email)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
        return photos.read(trip.getCover());
    }

    @Transactional(readOnly = true)
    public byte[] getSharedTripCover(String tripId) {
        TripEntity trip = trips.findById(tripId).orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
        return photos.read(trip.getCover());
    }

    @Transactional
    public TripDto create(String email, TripDto request) {
        validateDates(request);
        UserEntity user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        if (trips.existsById(request.id())) {
            throw new IllegalArgumentException("Trip id is already in use");
        }
        TripEntity trip = new TripEntity();
        trip.setId(request.id());
        trip.setUser(user);
        applyTripFields(trip, request);
        trips.save(trip);
        applyChildren(trip, request);
        return toDto(trip);
    }

    @Transactional
    public TripDto update(String email, String id, TripDto request) {
        if (!id.equals(request.id())) {
            throw new IllegalArgumentException("Trip id in request must match the URL");
        }
        validateDates(request);
        TripEntity trip = requireOwned(email, id);
        applyTripFields(trip, request);
        applyChildren(trip, request);
        return toDto(trip);
    }

    @Transactional
    public void delete(String email, String id) {
        TripEntity trip = requireOwned(email, id);
        deleteTrip(trip);
    }

    @Transactional
    public void deleteAllForUser(String email) {
        trips.findAllByUser_EmailIgnoreCaseOrderByStartDateAsc(email).forEach(this::deleteTrip);
    }

    private void deleteTrip(TripEntity trip) {
        String id = trip.getId();
        deletePhotoAfterCommit(trip.getCover());
        trip.getActivities().forEach(activity -> deletePhotoAfterCommit(activity.getImage()));
        memories.findAllByTrip_IdOrderByCreatedAtAsc(id).forEach(memory -> deletePhotoAfterCommit(memory.getFileUrl()));
        memories.deleteAllByTrip_Id(id);
        trips.delete(trip);
    }

    private TripEntity requireOwned(String email, String id) {
        return trips.findByIdAndUser_EmailIgnoreCase(id, email)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
    }

    private void validateDates(TripDto trip) {
        if (trip.start().isAfter(trip.end())) {
            throw new IllegalArgumentException("Trip start date must be on or before its end date");
        }
        if (trip.activities() != null && trip.activities().stream()
                .anyMatch(activity -> activity.date().isBefore(trip.start()) || activity.date().isAfter(trip.end()))) {
            throw new IllegalArgumentException("Every activity date must fall within the trip date range");
        }
    }

    private void applyTripFields(TripEntity trip, TripDto request) {
        trip.setName(request.name().trim());
        trip.setDestination(request.destination().trim());
        trip.setStartDate(request.start());
        trip.setEndDate(request.end());
        trip.setDescription(valueOrEmpty(request.description()));
        trip.setBudget(request.budget());
        trip.setColor(request.color());
        String cover = request.cover();
        if (("/api/trips/" + trip.getId() + "/photos/cover").equals(cover)) {
            cover = trip.getCover();
        } else if (cover != null && cover.startsWith("/api/")) {
            cover = null;
        }
        if (!java.util.Objects.equals(cover, trip.getCover())) {
            deletePhotoAfterCommit(trip.getCover());
        }
        trip.setCover(cover);
        trip.setTagline(request.tagline());
        trip.setLatitude(request.geo() == null ? null : request.geo().lat());
        trip.setLongitude(request.geo() == null ? null : request.geo().lon());
    }

    private void applyChildren(TripEntity trip, TripDto request) {
        updateActivities(trip, safe(request.activities()));
        updateExtras(trip, safe(request.extras()));
        updateChecklist(trip, safe(request.checklist()));
        updateMemories(trip, request);
    }

    private void updateActivities(TripEntity trip, List<ActivityDto> incoming) {
        Map<String, ActivityEntity> existing = new HashMap<>();
        trip.getActivities().forEach(activity -> existing.put(activity.getId(), activity));
        Set<String> retained = new HashSet<>();
        for (ActivityDto dto : incoming) {
            requireUniqueId(retained, dto.id());
            ActivityEntity activity = existing.get(dto.id());
            if (activity == null) {
                activity = new ActivityEntity();
                activity.setId(dto.id());
                activity.setTrip(trip);
                trip.getActivities().add(activity);
            }
            activity.setCategory(dto.category());
            activity.setTitle(dto.title().trim());
            activity.setDate(dto.date());
            activity.setTime(dto.time());
            activity.setLocation(valueOrEmpty(dto.location()));
            activity.setCost(dto.cost());
            activity.setActual(dto.actual());
            activity.setStatus(dto.status());
            activity.setNotes(valueOrEmpty(dto.notes()));
            String image = dto.image();
            String currentPhotoUrl = "/api/trips/" + trip.getId() + "/photos/activities/" + dto.id();
            if (currentPhotoUrl.equals(image)) {
                image = activity.getImage();
            } else if (image != null && image.startsWith("/api/")) {
                image = null;
            }
            activity.setImage(image);
            activity.setLatitude(dto.lat());
            activity.setLongitude(dto.lon());
        }
        trip.getActivities().removeIf(activity -> {
            if (retained.contains(activity.getId())) {
                return false;
            }
            deletePhotoAfterCommit(activity.getImage());
            return true;
        });
    }

    private void updateExtras(TripEntity trip, List<ExtraDto> incoming) {
        Map<String, ExtraEntity> existing = new HashMap<>();
        trip.getExtras().forEach(extra -> existing.put(extra.getId(), extra));
        Set<String> retained = new HashSet<>();
        for (ExtraDto dto : incoming) {
            requireUniqueId(retained, dto.id());
            ExtraEntity extra = existing.get(dto.id());
            if (extra == null) {
                extra = new ExtraEntity();
                extra.setId(dto.id());
                extra.setTrip(trip);
                trip.getExtras().add(extra);
            }
            extra.setLabel(dto.label().trim());
            extra.setCategory(dto.category());
            extra.setEstimatedCost(dto.est());
            extra.setActualCost(dto.actual());
        }
        trip.getExtras().removeIf(extra -> !retained.contains(extra.getId()));
    }

    private void updateChecklist(TripEntity trip, List<CheckDto> incoming) {
        Map<String, ChecklistEntity> existing = new HashMap<>();
        trip.getChecklist().forEach(item -> existing.put(item.getId(), item));
        Set<String> retained = new HashSet<>();
        for (CheckDto dto : incoming) {
            requireUniqueId(retained, dto.id());
            ChecklistEntity item = existing.get(dto.id());
            if (item == null) {
                item = new ChecklistEntity();
                item.setId(dto.id());
                item.setTrip(trip);
                trip.getChecklist().add(item);
            }
            item.setText(dto.text().trim());
            item.setDone(dto.done());
        }
        trip.getChecklist().removeIf(item -> !retained.contains(item.getId()));
    }

    private void updateMemories(TripEntity trip, TripDto request) {
        Map<String, ActivityEntity> activityById = new HashMap<>();
        trip.getActivities().forEach(activity -> activityById.put(activity.getId(), activity));
        List<PendingMemory> pending = new ArrayList<>();
        safe(request.memories()).forEach(memory -> pending.add(new PendingMemory(memory, null)));
        safe(request.activities()).forEach(activity -> safe(activity.memories())
                .forEach(memory -> pending.add(new PendingMemory(memory, activityById.get(activity.id())))));
        Set<String> ids = new HashSet<>();
        pending.forEach(item -> requireUniqueId(ids, item.dto().id()));

        Map<String, String> photoKeys = new HashMap<>();
        memories.findAllByTrip_IdOrderByCreatedAtAsc(trip.getId()).forEach(memory -> {
            if (memory.getFileUrl() != null) {
                photoKeys.put(memory.getId(), memory.getFileUrl());
            }
        });
        Set<String> retainedIds = pending.stream().map(item -> item.dto().id()).collect(java.util.stream.Collectors.toSet());
        photoKeys.forEach((id, key) -> {
            if (!retainedIds.contains(id)) {
                deletePhotoAfterCommit(key);
            }
        });
        memories.deleteAllByTrip_Id(trip.getId());
        memories.flush();
        for (PendingMemory item : pending) {
            MemoryDto dto = item.dto();
            MemoryEntity memory = new MemoryEntity();
            memory.setId(dto.id());
            memory.setTrip(trip);
            memory.setActivity(item.activity());
            memory.setKind(dto.kind() == null ? "note" : dto.kind());
            memory.setText(valueOrEmpty(dto.text()));
            memory.setCreatedAt(dto.at() == null ? Instant.now() : dto.at());
            memory.setEditedAt(dto.edited());
            memory.setFileUrl(photoKeys.get(dto.id()));
            memories.save(memory);
        }
    }

    private TripDto toDto(TripEntity trip) {
        List<MemoryEntity> tripMemories = memories.findAllByTrip_IdOrderByCreatedAtAsc(trip.getId());
        Map<String, List<MemoryDto>> activityMemories = new HashMap<>();
        List<MemoryDto> rootMemories = new ArrayList<>();
        for (MemoryEntity memory : tripMemories) {
            MemoryDto dto = new MemoryDto(memory.getId(), memory.getKind(), memory.getText(), memory.getCreatedAt(),
                    memory.getEditedAt(), photos.isPhotoKey(memory.getFileUrl())
                            ? "/api/trips/" + trip.getId() + "/photos/memories/" + memory.getId() : null);
            if (memory.getActivity() == null) {
                rootMemories.add(dto);
            } else {
                activityMemories.computeIfAbsent(memory.getActivity().getId(), ignored -> new ArrayList<>()).add(dto);
            }
        }
        List<ActivityDto> activities = trip.getActivities().stream()
                .sorted((a, b) -> {
                    int date = a.getDate().compareTo(b.getDate());
                    int time = date == 0 ? a.getTime().compareTo(b.getTime()) : date;
                    return time == 0 ? a.getId().compareTo(b.getId()) : time;
                })
                .map(activity -> new ActivityDto(
                        activity.getId(), activity.getCategory(), activity.getTitle(), activity.getDate(), activity.getTime(),
                        activity.getLocation(), activity.getCost(), activity.getActual(), activity.getStatus(),
                        activity.getNotes(), photos.isPhotoKey(activity.getImage())
                                ? "/api/trips/" + trip.getId() + "/photos/activities/" + activity.getId()
                                : activity.getImage(),
                        activity.getLatitude(), activity.getLongitude(),
                        activityMemories.getOrDefault(activity.getId(), List.of())))
                .toList();
        List<ExtraDto> extras = trip.getExtras().stream()
                .map(extra -> new ExtraDto(extra.getId(), extra.getLabel(), extra.getCategory(),
                        extra.getEstimatedCost(), extra.getActualCost()))
                .toList();
        List<CheckDto> checklist = trip.getChecklist().stream()
                .map(item -> new CheckDto(item.getId(), item.getText(), item.isDone()))
                .toList();
        GeoDto geo = trip.getLatitude() == null || trip.getLongitude() == null
                ? null
                : new GeoDto(trip.getLatitude(), trip.getLongitude());
        return new TripDto(
                trip.getId(), trip.getUser().getId(), trip.getName(), trip.getDestination(),
                trip.getStartDate(), trip.getEndDate(), trip.getDescription(), trip.getBudget(),
                checklist, geo, rootMemories, extras, trip.getColor(), photos.isPhotoKey(trip.getCover())
                        ? "/api/trips/" + trip.getId() + "/photos/cover" : trip.getCover(),
                trip.getTagline(), activities);
    }

    private static <T> List<T> safe(List<T> values) {
        return values == null ? List.of() : values;
    }

    private static String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private static void requireUniqueId(Set<String> ids, String id) {
        if (!ids.add(id)) {
            throw new IllegalArgumentException("Duplicate item id in trip request");
        }
    }

    private record PendingMemory(MemoryDto dto, ActivityEntity activity) {
    }

    private static MemoryDto withPhotoUrl(MemoryDto memory, String url) {
        return new MemoryDto(memory.id(), memory.kind(), memory.text(), memory.at(), memory.edited(),
                memory.photoUrl() == null ? null : url);
    }

    private void deletePhotoAfterCommit(String key) {
        if (!photos.isPhotoKey(key)) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    photos.delete(key);
                }
            });
        } else {
            photos.delete(key);
        }
    }
}
