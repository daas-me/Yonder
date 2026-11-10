package com.yonder.app.trip;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.context.WebApplicationContext;

import com.yonder.app.auth.dto.RegisterRequest;
import com.yonder.app.auth.repository.UserRepository;
import com.yonder.app.auth.service.UserService;
import com.yonder.app.trip.service.TripService;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import java.nio.file.Files;
import java.nio.file.Path;
import java.io.IOException;

@SpringBootTest
@ActiveProfiles("test")
class TripApiIntegrationTests {
    private static final String EMAIL = "trip-api-test@yonder.ph";
    private MockMvc mvc;

    @Autowired
    private WebApplicationContext applicationContext;

    @Autowired
    private UserRepository users;

    @Autowired
    private UserService userService;

    @Autowired
    private TripService tripService;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(applicationContext).apply(springSecurity()).build();
        users.deleteAll();
        userService.register(new RegisterRequest("Test Traveler", EMAIL, "testpass123"));
        tripService.deleteAllForUser(EMAIL);
    }

    @org.junit.jupiter.api.AfterEach
    void cleanStoredPhotos() throws IOException {
        Path directory = Path.of("target/test-photos");
        if (Files.exists(directory)) {
            try (var paths = Files.walk(directory)) {
                for (Path path : paths.sorted(java.util.Comparator.reverseOrder()).toList()) {
                    Files.deleteIfExists(path);
                }
            }
        }
    }

    @Test
    void newAccountsReceiveAnIllustratedStarterTripTheyCanDelete() throws Exception {
        String starterEmail = "starter-trip-test@yonder.ph";
        userService.register(new RegisterRequest("New Traveler", starterEmail, "testpass123"));

        var starter = tripService.list(starterEmail).getFirst();
        org.junit.jupiter.api.Assertions.assertEquals("Your sample: Baguio weekend", starter.name());
        org.junit.jupiter.api.Assertions.assertEquals("/sample-images/baguio-cover.svg", starter.cover());
        org.junit.jupiter.api.Assertions.assertEquals(2, starter.activities().size());
        org.junit.jupiter.api.Assertions.assertEquals(
                "/sample-images/burnham-park.svg", starter.activities().getFirst().image());
        org.junit.jupiter.api.Assertions.assertEquals(1, starter.checklist().size());
        org.junit.jupiter.api.Assertions.assertEquals(1, starter.extras().size());

        mvc.perform(delete("/api/trips/" + starter.id()).with(user(starterEmail)).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/trips").with(user(starterEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void tripCrudIsValidatedAndScopedToTheSignedInOwner() throws Exception {
        String trip = """
                {
                  "id": "trip-test-1",
                  "name": "Baguio weekend",
                  "destination": "Baguio City",
                  "start": "2026-11-20",
                  "end": "2026-11-22",
                  "description": "",
                  "activities": [{
                    "id": "activity-test-1",
                    "category": "transport",
                    "title": "Bus",
                    "date": "2026-11-20",
                    "time": "06:00",
                    "location": "Cubao",
                    "cost": 750.00,
                    "notes": ""
                  }],
                  "extras": [],
                  "checklist": [],
                  "memories": []
                }
                """;
        mvc.perform(get("/api/trips").with(user(EMAIL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mvc.perform(post("/api/trips").with(user(EMAIL)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(trip))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("trip-test-1"))
                .andExpect(jsonPath("$.activities[0].id").value("activity-test-1"));

        mvc.perform(get("/api/trips/trip-test-1").with(user(EMAIL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerId").isNotEmpty());

        mvc.perform(get("/api/trips/trip-test-1").with(user("another@yonder.ph")))
                .andExpect(status().isNotFound());

        String invalidDateRange = trip.replace("\"end\": \"2026-11-22\"", "\"end\": \"2026-11-19\"");
        mvc.perform(put("/api/trips/trip-test-1").with(user(EMAIL)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(invalidDateRange))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Trip start date must be on or before its end date"));

        mvc.perform(delete("/api/trips/trip-test-1").with(user(EMAIL)).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/trips/trip-test-1").with(user(EMAIL)))
                .andExpect(status().isNotFound());
    }

    @Test
    void groupTripSettingsAndPayerAllocationsPersistAndAppearInReadOnlyShares() throws Exception {
        String groupTrip = """
                {
                  "id": "group-trip-test",
                  "name": "Baguio with friends",
                  "destination": "Baguio",
                  "start": "2026-11-20",
                  "end": "2026-11-21",
                  "description": "",
                  "groupTrip": true,
                  "travelers": [
                    {"id": "owner", "name": "You"},
                    {"id": "friend", "name": "Lee"}
                  ],
                  "categoryShareModes": {"food": "own", "transport": "equal"},
                  "activities": [{
                    "id": "group-lunch",
                    "category": "food",
                    "title": "Lunch",
                    "date": "2026-11-20",
                    "time": "12:00",
                    "location": "Baguio",
                    "cost": 100.00,
                    "actual": 80.00,
                    "notes": "",
                    "shareMode": "own",
                    "sharedTravelerIds": [],
                    "personalAmounts": {"owner": 25.00, "friend": 75.00}
                  }],
                  "extras": [],
                  "checklist": [],
                  "memories": []
                }
                """;

        mvc.perform(post("/api/trips").with(user(EMAIL)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(groupTrip))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.groupTrip").value(true))
                .andExpect(jsonPath("$.travelers.length()").value(2))
                .andExpect(jsonPath("$.categoryShareModes.food").value("own"))
                .andExpect(jsonPath("$.activities[0].shareMode").value("own"))
                .andExpect(jsonPath("$.activities[0].personalAmounts.owner").value(25.0));

        mvc.perform(get("/api/trips/group-trip-test").with(user(EMAIL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.travelers[1].name").value("Lee"))
                .andExpect(jsonPath("$.activities[0].personalAmounts.friend").value(75.0));

        MvcResult share = mvc.perform(post("/api/trips/group-trip-test/share").with(user(EMAIL)).with(csrf()))
                .andExpect(status().isCreated()).andReturn();
        String token = com.jayway.jsonpath.JsonPath.read(share.getResponse().getContentAsString(), "$.token");
        mvc.perform(get("/api/shared/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.groupTrip").value(true))
                .andExpect(jsonPath("$.travelers.length()").value(2))
                .andExpect(jsonPath("$.activities[0].personalAmounts.friend").value(75.0));

        mvc.perform(post("/api/trips").with(user(EMAIL)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(groupTrip.replace(
                                "\"group-trip-test\"", "\"invalid-group-trip-test\"")
                                .replace("\"group-lunch\"", "\"invalid-group-lunch\"")
                                .replace("\"Baguio with friends\"", "\"Invalid group trip\"")
                                .replace("\"friend\": 75.00", "\"friend\": 70.00")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginCreatesAnAuthenticatedSessionWithoutExposingPasswordData() throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"trip-api-test@yonder.ph","password":"testpass123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andReturn();

        mvc.perform(get("/api/auth/me").session((org.springframework.mock.web.MockHttpSession) result.getRequest().getSession(false)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty());
    }

    @Test
    void registrationRejectsInvalidEmailsAndWeakPasswords() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"New Traveler","email":"invalid-email","password":"SecurePass1!"}
                                """))
                .andExpect(status().isBadRequest());

        for (String password : new String[] { "short1!", "alllowercase1!", "ALLUPPERCASE1!", "NoNumber!!", "NoSpecial123" }) {
            mvc.perform(post("/api/auth/register").with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"name":"New Traveler","email":"new-traveler@yonder.ph","password":"%s"}
                                    """.formatted(password)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void unknownAccountsAndIncorrectPasswordsReturnTheSameLoginError() throws Exception {
        String unknownAccount = """
                {"email":"missing@yonder.ph","password":"testpass123"}
                """;
        String incorrectPassword = """
                {"email":"trip-api-test@yonder.ph","password":"wrongpass123"}
                """;

        mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(unknownAccount))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Incorrect email or password"));

        mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(incorrectPassword))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Incorrect email or password"));
    }

    @Test
    void unauthenticatedRequestsReturnStructuredApiErrors() throws Exception {
        mvc.perform(get("/api/trips"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Authentication is required"));
    }

    @Test
    void profilePhotoCanBeUploadedReadAndRemovedByItsOwner() throws Exception {
        byte[] jpeg = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xd9};
        MockMultipartFile photo = new MockMultipartFile("file", "profile.jpg", "image/jpeg", jpeg);

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .multipart("/api/me/photo").file(photo).with(user(EMAIL)).with(csrf())
                        .with(request -> { request.setMethod("PUT"); return request; }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrl").value("/api/me/photo"));

        mvc.perform(get("/api/auth/me").with(user(EMAIL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrl").value("/api/me/photo"));
        mvc.perform(get("/api/me/photo").with(user(EMAIL)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                .andExpect(content().bytes(jpeg));
        mvc.perform(get("/api/me/photo").with(user("another@yonder.ph")))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/me/photo").with(user(EMAIL)).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").with(user(EMAIL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrl").doesNotExist());
    }

    @Test
    void photosAreStoredAndOnlyServedToTheTripOwner() throws Exception {
        String trip = """
                {
                  "id": "trip-photo-test",
                  "name": "Photo test",
                  "destination": "Baguio",
                  "start": "2026-11-20",
                  "end": "2026-11-22",
                  "description": "",
                  "activities": [],
                  "extras": [],
                  "checklist": [],
                  "memories": [{
                    "id": "memory-photo-test",
                    "kind": "photo",
                    "text": "",
                    "at": "2026-11-20T10:00:00Z"
                  }]
                }
                """;
        mvc.perform(post("/api/trips").with(user(EMAIL)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(trip))
                .andExpect(status().isCreated());

        byte[] jpeg = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xd9};
        MockMultipartFile photo = new MockMultipartFile("file", "memory.jpg", "image/jpeg", jpeg);
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .multipart("/api/trips/trip-photo-test/photos/memories/memory-photo-test")
                        .file(photo).with(user(EMAIL)).with(csrf())
                        .with(request -> { request.setMethod("PUT"); return request; }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("/api/trips/trip-photo-test/photos/memories/memory-photo-test"));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .multipart("/api/trips/trip-photo-test/photos/cover")
                        .file(photo).with(user(EMAIL)).with(csrf())
                        .with(request -> { request.setMethod("PUT"); return request; }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("/api/trips/trip-photo-test/photos/cover"));

        mvc.perform(get("/api/trips/trip-photo-test").with(user(EMAIL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cover").value("/api/trips/trip-photo-test/photos/cover"))
                .andExpect(jsonPath("$.memories[0].photoUrl").value(
                        "/api/trips/trip-photo-test/photos/memories/memory-photo-test"));
        mvc.perform(get("/api/trips/trip-photo-test/photos/cover").with(user(EMAIL)))
                .andExpect(status().isOk()).andExpect(content().bytes(jpeg));
        mvc.perform(get("/api/trips/trip-photo-test/photos/cover").with(user("stranger@yonder.ph")))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/trips/trip-photo-test/photos/memories/memory-photo-test").with(user(EMAIL)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                .andExpect(content().bytes(jpeg));
        mvc.perform(get("/api/trips/trip-photo-test/photos/memories/memory-photo-test").with(user("stranger@yonder.ph")))
                .andExpect(status().isNotFound());

        MvcResult share = mvc.perform(post("/api/trips/trip-photo-test/share").with(user(EMAIL)).with(csrf()))
                .andExpect(status().isCreated()).andReturn();
        String token = com.jayway.jsonpath.JsonPath.read(share.getResponse().getContentAsString(), "$.token");
        mvc.perform(get("/api/shared/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cover").value("/api/shared/" + token + "/photos/cover"))
                .andExpect(jsonPath("$.memories[0].photoUrl")
                        .value("/api/shared/" + token + "/photos/memories/memory-photo-test"));
        mvc.perform(get("/api/shared/" + token + "/photos/cover"))
                .andExpect(status().isOk()).andExpect(content().bytes(jpeg));
        mvc.perform(get("/api/shared/" + token + "/photos/memories/memory-photo-test"))
                .andExpect(status().isOk()).andExpect(content().bytes(jpeg));
    }

    @Test
    void shareLinksAreRandomReadOnlyAndRevocable() throws Exception {
        String trip = """
                {
                  "id": "trip-share-test",
                  "name": "Shared test",
                  "destination": "Baguio",
                  "start": "2026-11-20",
                  "end": "2026-11-22",
                  "description": "",
                  "activities": [],
                  "extras": [],
                  "checklist": [],
                  "memories": []
                }
                """;
        mvc.perform(post("/api/trips").with(user(EMAIL)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(trip))
                .andExpect(status().isCreated());
        MvcResult created = mvc.perform(post("/api/trips/trip-share-test/share").with(user(EMAIL)).with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();
        String token = com.jayway.jsonpath.JsonPath.read(created.getResponse().getContentAsString(), "$.token");
        mvc.perform(get("/api/shared/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Shared test"))
                .andExpect(jsonPath("$.ownerId").value(""));

        mvc.perform(delete("/api/trips/trip-share-test/shares").with(user(EMAIL)).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/shared/" + token))
                .andExpect(status().isNotFound());
    }
}
