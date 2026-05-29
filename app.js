import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQlpFMV2-3e7HNQ6CMXPWu8z4-onFejpo",
  authDomain: "topsong-f34f3.firebaseapp.com",
  databaseURL: "https://topsong-f34f3-default-rtdb.firebaseio.com",
  projectId: "topsong-f34f3",
  storageBucket: "topsong-f34f3.firebasestorage.app",
  messagingSenderId: "191676309381",
  appId: "1:191676309381:web:4512bc4b7d7fbaadcd2eec"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let isSignUpMode = false;
let currentUserId = null;
let activeTaskListener = null;
let activeResourceListener = null;

// --- DYNAMIC CORE REACTION ROUTER MANAGER ---
function transitionGlobalView(viewState) {
    document.querySelectorAll(".app-route-view").forEach(view => view.classList.add("d-none"));
    
    if (viewState === "landing") {
        document.getElementById("landing-view").classList.remove("d-none");
    } else if (viewState === "auth") {
        document.getElementById("auth-view").classList.remove("d-none");
    } else if (viewState === "dashboard") {
        document.getElementById("dashboard-view").classList.remove("d-none");
    }
}

// Global Event Triggers to Enter Auth State from Landing page elements
document.querySelectorAll(".nav-to-auth-btn").forEach(btn => {
    btn.addEventListener("click", () => transitionGlobalView("auth"));
});

// --- SUB-PANE INTERNAL DASHBOARD INTERFACE NAVIGATION ---
document.querySelectorAll(".sidebar-nav-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const targetPaneId = e.currentTarget.dataset.target;
        
        document.querySelectorAll(".app-pane").forEach(pane => pane.classList.add("d-none"));
        document.getElementById(targetPaneId).classList.remove("d-none");
        
        document.querySelectorAll(".sidebar-nav-btn").forEach(b => {
            b.classList.remove("active-route-btn", "text-white");
            b.classList.add("bg-transparent", "text-secondary");
        });
        e.currentTarget.classList.add("active-route-btn", "text-white");
        e.currentTarget.classList.remove("bg-transparent", "text-secondary");

        const responsiveSidebar = document.getElementById("sidebarMenu");
        if (window.getComputedStyle(responsiveSidebar).display !== "none" && window.innerWidth < 768) {
            new bootstrap.Collapse(responsiveSidebar).toggle();
        }
    });
});

 
// --- UPDATE YOUR AUTH WATCHER TO THIS ---
onAuthStateChanged(auth, (user) => {
    // Target our new global loader wrapper
    const globalLoader = document.getElementById("global-loader");

    if (user) {
        currentUserId = user.uid;
        document.getElementById("sidebar-user-id").textContent = user.email.split('@')[0];
        document.getElementById("profile-display-email").textContent = user.email;
        
        transitionGlobalView("dashboard");
        streamTasksPipeline();
        streamResourcesPipeline();
    } else {
        currentUserId = null;
        if (activeTaskListener) activeTaskListener();
        if (activeResourceListener) activeResourceListener();
        
        // Go to landing page ONLY if verified that no token exists
        transitionGlobalView("landing");
    }

    // Hide the global loading overlay once Firebase gives us a clear answer
    if (globalLoader) {
        globalLoader.classList.add("d-none");
    }
});

// --- REGISTER SELECTION UTILITIES ---
document.getElementById("auth-toggle-link").addEventListener("click", (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    document.getElementById("name-group").classList.toggle("d-none", !isSignUpMode);
    document.getElementById("auth-title").textContent = isSignUpMode ? "Create Account" : "EduTrack Ecosystem";
    document.getElementById("auth-submit-btn").textContent = isSignUpMode ? "Provision Account" : "Establish Link Access";
});

document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    try {
        if (isSignUpMode) await createUserWithEmailAndPassword(auth, email, password);
        else await signInWithEmailAndPassword(auth, email, password);
        document.getElementById("auth-form").reset();
    } catch (err) { alert(err.message); }
});

document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

// =========================================================================
// =================== DATA CRUD INFRASTRUCTURE PIPELINES ===================
// =========================================================================

const taskForm = document.getElementById("task-form");
taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("task-id").value;
    const payload = {
        title: document.getElementById("task-title").value.trim(),
        course: document.getElementById("task-course").value.trim(),
        dueDate: document.getElementById("task-date").value,
        userId: currentUserId,
        isCompleted: false
    };
    try {
        if (id) {
            await updateDoc(doc(db, "tasks", id), { title: payload.title, course: payload.course, dueDate: payload.dueDate });
            resetFormState();
        } else {
            await addDoc(collection(db, "tasks"), payload);
            taskForm.reset();
        }
    } catch (err) { alert(err.message); }
});

function streamTasksPipeline() {
    const q = query(collection(db, "tasks"), where("userId", "==", currentUserId));
    activeTaskListener = onSnapshot(q, (snapshot) => {
        const loadingIndicator = document.getElementById("tasks-loading");
        if (loadingIndicator) loadingIndicator.remove();
        
        const container = document.getElementById("tasks-container");
        container.innerHTML = "";
        
        let total = 0, pending = 0, done = 0;

        snapshot.forEach(docSnap => {
            total++;
            const data = docSnap.data();
            if (data.isCompleted) done++; else pending++;

            container.insertAdjacentHTML("beforeend", `
                <div class="col-md-6">
                    <div class="card h-100 border-0 shadow-sm task-card ${data.isCompleted ? 'border-start border-success border-4' : ''}">
                        <div class="card-body d-flex flex-column justify-content-between">
                            <div>
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="badge bg-light text-secondary border small">${data.course}</span>
                                    <span class="small text-muted"><i class="bi bi-calendar-event me-1"></i>${data.dueDate}</span>
                                </div>
                                <h6 class="fw-bold text-dark-blue ${data.isCompleted ? 'text-decoration-line-through text-muted' : ''}">${data.title}</h6>
                            </div>
                            <div class="d-flex gap-2 justify-content-end mt-3 pt-2 border-top border-light">
                                <button class="btn btn-sm ${data.isCompleted ? 'btn-success' : 'btn-outline-secondary'} chk-t" data-id="${docSnap.id}" data-status="${data.isCompleted}"><i class="bi bi-check-lg"></i></button>
                                <button class="btn btn-sm btn-outline-primary ed-t" data-id="${docSnap.id}" data-title="${data.title}" data-course="${data.course}" data-date="${data.dueDate}"><i class="bi bi-pencil"></i></button>
                                <button class="btn btn-sm btn-outline-danger del-t" data-id="${docSnap.id}"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                    </div>
                </div>`);
        });

        document.getElementById("stat-total").textContent = total;
        document.getElementById("stat-pending").textContent = pending;
        document.getElementById("stat-done").textContent = done;
        document.getElementById("stat-ratio").textContent = total > 0 ? `${Math.round((done / total) * 100)}%` : "0%";

        attachTaskListeners();
    });
}

function attachTaskListeners() {
    document.querySelectorAll(".del-t").forEach(b => b.addEventListener("click", e => deleteDoc(doc(db, "tasks", e.currentTarget.dataset.id))));
    document.querySelectorAll(".chk-t").forEach(b => b.addEventListener("click", e => updateDoc(doc(db, "tasks", e.currentTarget.dataset.id), { isCompleted: e.currentTarget.dataset.status !== "true" })));
    document.querySelectorAll(".ed-t").forEach(b => b.addEventListener("click", e => {
        const t = e.currentTarget.dataset;
        document.getElementById("task-id").value = t.id;
        document.getElementById("task-title").value = t.title;
        document.getElementById("task-course").value = t.course;
        document.getElementById("task-date").value = t.date;
        document.getElementById("form-action-title").textContent = "Modify Task Parameters";
        document.getElementById("cancel-edit-btn").classList.remove("d-none");
    }));
}

document.getElementById("cancel-edit-btn").addEventListener("click", resetFormState);
function resetFormState() {
    taskForm.reset();
    document.getElementById("task-id").value = "";
    document.getElementById("form-action-title").textContent = "Configure Schedule Record";
    document.getElementById("cancel-edit-btn").classList.add("d-none");
}

document.getElementById("resource-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        title: document.getElementById("res-title").value.trim(),
        url: document.getElementById("res-url").value.trim(),
        userId: currentUserId
    };
    try {
        await addDoc(collection(db, "resources"), payload);
        document.getElementById("resource-form").reset();
    } catch (err) { alert(err.message); }
});

function streamResourcesPipeline() {
    const q = query(collection(db, "resources"), where("userId", "==", currentUserId));
    activeResourceListener = onSnapshot(q, (snapshot) => {
        const container = document.getElementById("resources-container");
        container.innerHTML = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            container.insertAdjacentHTML("beforeend", `
                <div class="col-12">
                    <div class="card border-0 shadow-sm p-3 d-flex flex-row justify-content-between align-items-center">
                        <div class="overflow-hidden">
                            <h6 class="mb-0 fw-bold text-dark-blue text-truncate">${data.title}</h6>
                            <a href="${data.url}" target="_blank" class="small text-primary text-decoration-none text-truncate d-block">${data.url}</a>
                        </div>
                        <button class="btn btn-sm btn-link text-danger del-r" data-id="${docSnap.id}"><i class="bi bi-x-circle-fill"></i></button>
                    </div>
                </div>`);
        });
        document.querySelectorAll(".del-r").forEach(b => b.addEventListener("click", e => deleteDoc(doc(db, "resources", e.currentTarget.dataset.id))));
    });
}