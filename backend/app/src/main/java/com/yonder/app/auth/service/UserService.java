package com.yonder.app.auth.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.yonder.app.auth.dto.ProfileRequest;
import com.yonder.app.auth.dto.RegisterRequest;
import com.yonder.app.auth.dto.UserDto;
import com.yonder.app.auth.entity.UserEntity;
import com.yonder.app.auth.repository.UserRepository;
import com.yonder.app.common.ConflictException;
import com.yonder.app.common.ResourceNotFoundException;
import com.yonder.app.trip.service.PhotoStorageService;
import com.yonder.app.trip.service.TripService;

@Service
public class UserService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TripService trips;
    private final PhotoStorageService photos;

    public UserService(
            UserRepository users, PasswordEncoder passwordEncoder, TripService trips, PhotoStorageService photos) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.trips = trips;
        this.photos = photos;
    }

    @Transactional
    public UserDto register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with this email already exists");
        }
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID().toString());
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setCreatedAt(Instant.now());
        return toDto(users.save(user));
    }

    @Transactional(readOnly = true)
    public UserEntity requireByEmail(String email) {
        return users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
    }

    @Transactional(readOnly = true)
    public UserDto getByEmail(String email) {
        return toDto(requireByEmail(email));
    }

    @Transactional
    public UserDto updateProfile(String currentEmail, ProfileRequest request) {
        UserEntity user = requireByEmail(currentEmail);
        String nextEmail = request.email().trim().toLowerCase();
        users.findByEmailIgnoreCase(nextEmail)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> { throw new ConflictException("An account with this email already exists"); });
        user.setName(request.name().trim());
        user.setEmail(nextEmail);
        user.setHomeCity(request.homeCity() == null ? "" : request.homeCity().trim());
        return toDto(user);
    }

    @Transactional
    public UserDto uploadProfilePhoto(String email, MultipartFile file) {
        UserEntity user = requireByEmail(email);
        String oldKey = user.getPhotoKey();
        user.setPhotoKey(photos.store(file));
        deletePhotoAfterCommit(oldKey);
        return toDto(user);
    }

    @Transactional(readOnly = true)
    public byte[] getProfilePhoto(String email) {
        UserEntity user = requireByEmail(email);
        return photos.read(user.getPhotoKey());
    }

    @Transactional
    public void deleteProfilePhoto(String email) {
        UserEntity user = requireByEmail(email);
        String oldKey = user.getPhotoKey();
        user.setPhotoKey(null);
        deletePhotoAfterCommit(oldKey);
    }

    @Transactional
    public void updatePassword(String email, String currentPassword, String newPassword) {
        UserEntity user = requireByEmail(email);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
    }

    @Transactional
    public void delete(String email) {
        String photoKey = requireByEmail(email).getPhotoKey();
        trips.deleteAllForUser(email);
        users.delete(requireByEmail(email));
        deletePhotoAfterCommit(photoKey);
    }

    public UserDto toDto(UserEntity user) {
        String photoUrl = photos.isPhotoKey(user.getPhotoKey()) ? "/api/me/photo" : null;
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getHomeCity(), user.getCreatedAt(), photoUrl);
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
