let contactManagerApp;

(function() {
  contactManagerApp = {
    contacts: null,
    DOMAIN: "http://localhost:3000",
    addContactLink: null,
    editLinks: null,
    deleteContactLinks: null,
    selectTags: null,

    retrieveCreateContactFormPage: function(path) {
      let request = new XMLHttpRequest();
      request.open("GET", this.DOMAIN + path);
      request.addEventListener("load", event => {
        console.log(request.status);
        if (request.status === 200) {
          window.location.href = "http://localhost:3000/createContact.html";
        } else {
          console.error("Unable to load the Create Contact Form Page.");
        }
      });
      request.send();
    },

    retrieveContacts: function(path) {
      return new Promise((resolve, reject) => {
        let request = new XMLHttpRequest();
        request.open("GET", this.DOMAIN + path);
        request.responseType = "json";
        request.addEventListener("load", event => {
          if (request.status === 200) {
            resolve(request.response);
          } else {
            reject("Error: Could not retrieve the contacts");
          }
        });

        request.send();
      });
    },

    filterContactList: function(element) {
      let selectedValues = Array.from(element.selectedOptions).map(option => option.value);
      if (selectedValues[0] === "all") {
        this.populateContactsTable(this.contacts);
        return;
      }

      // console.log(selectedValues); // ['work']
      let filteredContacts = [];
      for (let idx = 0; idx < this.contacts.length; idx += 1) {
        let contact = this.contacts[idx];
        // console.log("contact.tags is ", contact.tags);
        for (let j = 0; j < selectedValues.length; j += 1) {
          let selectedTag = selectedValues[j];
          // console.log("selectedTag is ", selectedTag);
          if (contact.tags !== null  && contact.tags.includes(selectedTag)) {
            filteredContacts.push(contact);
          } else if (contact.tags === null && selectedTag === "null") {
            filteredContacts.push(contact);
          }
        }
      }

      this.populateContactsTable(filteredContacts);
    },

    populateContactsTable: function(matches) {
      let tbody = document.querySelector("tbody");
      tbody.innerHTML = "";
      matches.forEach((match, index) => {
        let tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${match.full_name}</td>
          <td>${match.email}</td>
          <td>${match.phone_number}</td>
          <td>${match.tags}</td>
          <td>
            <div>
              <button type="text" class="edit_button" data-id="${match.id}">
                <i class="fa fa-edit"></i>
                Edit
              </button>
            </div>
            <div>
              <button type="text" class="delete_button" data-id="${match.id}">
                <i class="fa fa-trash-o"></i>
                Delete
              </button>
            </div>
          </td>`;
        tbody.appendChild(tr);
      });
    },

    handleEditClick: function(event) {
      event.preventDefault();
      const contactId = event.target.closest("button").getAttribute("data-id");
      console.log("Editing contact with ID:", contactId); // Debug log

      this.retrieveContactDetails(contactId).then(contact => {
        // Store contact in localStorage to pass to edit page
        localStorage.setItem("currentContact", JSON.stringify(contact));
        window.location.href = "http://localhost:3000/editContact.html";
      }).catch(error => {
        console.error("Error fetching contact details:", error);
        alert("Could not retrieve contact details.");
      });
    },

    handleDeleteClick: function(event) {
      event.preventDefault();
      const contactId = event.target.closest("button").getAttribute("data-id");
      // Confirm deletion with the user
      const userConfirmed = confirm(`Are you sure you want to delete the contact with ID: ${contactId}?`);

      if (!userConfirmed) {
        return; // Exit if the user cancels
      }

      let request = new XMLHttpRequest();
      request.open("DELETE", `${this.DOMAIN}/api/contacts/${contactId}`);
      request.addEventListener("load", event => {
        if (request.status === 204) {
          alert(`Successfully deleted contact with ID: ${contactId}`);
          window.location.href = "http://localhost:3000/index.html";
        } else {
          alert(`Error ${request.status}: Unable to delete`, request.responseText)
        }
      });
      request.send();
    },

    retrieveContactDetails: function(id) {
      return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", `${this.DOMAIN}/api/contacts/${id}`);
        request.responseType = "json";

        request.addEventListener("load", () => {
          if (request.status === 200) {
            resolve(request.response);
          } else {
            reject(`Contact with ID ${id} not found.`);
          }
        });

        request.send();
      });
    },

    cacheTemplate: async function() {
      [this.contacts] = (await Promise.allSettled([
        this.retrieveContacts("/api/contacts")
      ])).map(resolvedPromise => resolvedPromise.value);

      // Sort the contacts received in ascending order based on full_name of the contact
      this.contacts.sort((contact1, contact2) => {
        let a = contact1.full_name;
        let b = contact2.full_name;
        if (a > b) {
          return 1;
        } else if (a < b) {
          return -1;
        } else {
          return 0;
        }
      });

      // Compile both templates for use later
      let contactsTemplate = Handlebars.compile(document.querySelector("#contactsTemplate").innerHTML);
      let contactTemplate = Handlebars.compile(document.querySelector("#contactTemplate").innerHTML);
      let tbody = document.querySelector("tbody");
      // Register the contact template as a partial 
      Handlebars.registerPartial("contactTemplate", document.querySelector("#contactTemplate").innerHTML);
      // Write the current contacts list to the table tbody element 
      tbody.innerHTML = contactsTemplate({ contacts: this.contacts });
       
    },

    bindEvents: function() {
      // Appending the click event listener to the `addContactLink` button link. 
      if (this.addContactLink) {
        this.addContactLink.addEventListener("click", event => {
          event.preventDefault();
          this.retrieveCreateContactFormPage(this.addContactLink.getAttribute("href"));
        });
      } else {
        console.error("Add Contact Button is not working properly.")
      } 
      // Appending change event listener to the `selectTags` dropdown menu 
      if (this.selectTags) {
        this.selectTags.addEventListener("change", event => {
          event.preventDefault;
          this.filterContactList(this.selectTags);
        });
      } else {
        console.error("Select Tags is not working properly.")
      }

      // Event delegation for Edit and Delete buttons
      const tbody = document.querySelector("tbody");
      tbody.addEventListener("click", event => {
        const target = event.target.closest("button"); // Check if the clicked element is a button
        if (!target) return;

        if (target.classList.contains("edit_button")) {
          this.handleEditClick(event);
        } else if (target.classList.contains("delete_button")) {
          this.handleDeleteClick(event);
        }
      });
    },

    init: async function() {
      await this.cacheTemplate();
      this.addContactLink = document.querySelector("#create_contact_link");
      this.selectTags = document.querySelector("#tags");
      this.bindEvents();
    }
  };
})();

document.addEventListener("DOMContentLoaded", e => contactManagerApp.init.bind(contactManagerApp)());