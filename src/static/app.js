document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Ensure select is empty before populating (avoid duplicates on re-fetch)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Construire le HTML de la liste des participants
        const participants = Array.isArray(details.participants) ? details.participants : [];
        let participantsHTML = "";
        if (participants.length === 0) {
          participantsHTML = `<p class="info" style="margin-top:8px;">Aucun participant pour le moment.</p>`;
        } else {
          const items = participants
            .map(
              (p) => `<li><span class="participant-badge">${escapeHtml(String(p))}</span> <button class="remove-btn" data-activity="${escapeHtml(
                name
              )}" data-email="${escapeHtml(String(p))}" aria-label="Remove participant">🗑️</button></li>`
            )
            .join("");
          participantsHTML = `<div class="participants"><strong>Participants:</strong><ul class="participants-list">${items}</ul></div>`;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Trouver la carte d'activité correspondante
        const activityCards = document.querySelectorAll('.activity-card');
        const activityCard = Array.from(activityCards).find(card => 
          card.querySelector('h4').textContent.trim() === activity
        );

        if (activityCard) {
          let participantsDiv = activityCard.querySelector(".participants");
          let participantsList = activityCard.querySelector(".participants-list");
          
          if (!participantsDiv) {
            // Créer la section participants si elle n'existe pas
            participantsDiv = document.createElement("div");
            participantsDiv.className = "participants";
            participantsDiv.innerHTML = "<strong>Participants:</strong>";
            participantsList = document.createElement("ul");
            participantsList.className = "participants-list";
            participantsDiv.appendChild(participantsList);
            activityCard.appendChild(participantsDiv);
          } else if (participantsDiv.querySelector('.info')) {
            // Remplacer le message "Aucun participant" par une nouvelle liste
            participantsDiv.innerHTML = "<strong>Participants:</strong>";
            participantsList = document.createElement("ul");
            participantsList.className = "participants-list";
            participantsDiv.appendChild(participantsList);
          }

          // Créer et ajouter le nouvel élément participant
          const newItem = document.createElement("li");
          newItem.innerHTML = `
            <span class="participant-badge">${escapeHtml(email)}</span>
            <button class="remove-btn" data-activity="${escapeHtml(activity)}" 
                    data-email="${escapeHtml(email)}" aria-label="Remove participant">🗑️</button>
          `;
          
          // Ajouter au début de la liste
          participantsList = activityCard.querySelector(".participants-list");
          if (participantsList.firstChild) {
            participantsList.insertBefore(newItem, participantsList.firstChild);
          } else {
            participantsList.appendChild(newItem);
          }

          // Mettre à jour le compteur de places
          const availabilityParagraphs = activityCard.querySelectorAll('p');
          const spotsCountElement = Array.from(availabilityParagraphs).find(p => 
            p.textContent.includes('Availability:')
          );
          if (spotsCountElement) {
            const currentSpots = parseInt(spotsCountElement.textContent.match(/\d+/)[0]);
            spotsCountElement.textContent = `Availability: ${currentSpots - 1} spots left`;
          }
        }

        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Helper to escape HTML when injecting text
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initialize app
  fetchActivities();

  const modal = document.getElementById("confirm-modal");
  const modalMessage = document.getElementById("modal-message");
  const modalConfirm = document.getElementById("modal-confirm");
  const modalCancel = document.getElementById("modal-cancel");

  let pendingUnregister = null;

  // Delegate click handler for remove buttons inside activities list
  activitiesList.addEventListener("click", (event) => {
    const btn = event.target.closest(".remove-btn");
    if (!btn) return;

    const activityName = btn.dataset.activity;
    const email = btn.dataset.email;
    if (!activityName || !email) return;

    // Store reference to list item for later removal
    pendingUnregister = {
      activityName,
      email,
      listItem: btn.closest("li"),
      activityCard: btn.closest(".activity-card")
    };

    modalMessage.textContent = `Voulez-vous vraiment désinscrire ${email} de l'activité ${activityName} ?`;
    modal.classList.remove("hidden");
  });

  modalCancel.addEventListener("click", () => {
    modal.classList.add("hidden");
    pendingUnregister = null;
  });

  modalConfirm.addEventListener("click", async () => {
    if (!pendingUnregister) return;
    
    const { activityName, email, listItem, activityCard } = pendingUnregister;
    modal.classList.add("hidden");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (response.ok) {
        // Remove participant from list without full refresh
        listItem.remove();
        
        // Update participant count
        const participantsList = activityCard.querySelector(".participants-list");
        if (participantsList.children.length === 0) {
          const participantsDiv = activityCard.querySelector(".participants");
          participantsDiv.innerHTML = '<p class="info" style="margin-top:8px;">Aucun participant pour le moment.</p>';
        }

        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");

        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 4000);
      } else {
        messageDiv.textContent = result.detail || "Échec de la désinscription";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    } catch (error) {
      messageDiv.textContent = "Échec de la désinscription. Veuillez réessayer.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering participant:", error);
    }
    
    pendingUnregister = null;
  });
});
