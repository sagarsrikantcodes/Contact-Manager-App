import debounce from './debounce.js';

class Autocomplete {
  wrapInput() {
    let wrapper = document.createElement("div");
    wrapper.classList.add("autocomplete-wrapper");
    this.input.parentNode.appendChild(wrapper);
    wrapper.appendChild(this.input);
  }

  createUI() {
    let listUI = document.createElement("ul");
    listUI.classList.add("autocomplete-ui");
    this.input.parentNode.appendChild(listUI);
    this.listUI = listUI;

    let overlay = document.createElement("div");
    overlay.classList.add("autocomplete-overlay");
    overlay.style.qidth = `${this.input.clientWidth}px`;

    this.input.parentNode.appendChild(overlay);
    this.overlay = overlay;
  }

  bindEvents() {
    this.input.addEventListener("input", this.valueChanged);
    this.input.addEventListener("keydown", this.handleKeydown.bind(this));
    this.listUI.addEventListener("mousedown", this.handleMousedown.bind(this));
  }

  handleKeydown(event) {
    switch(event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (this.selectedIndex === null || this.selectedIndex === this.matches.length - 1) {
          this.selectedIndex = 0;
        } else {
          this.selectedIndex += 1;
        }
        this.bestMatchIndex = null;
        this.draw();
        break;
      case "ArrowUp":
        event.preventDefault();
        if (this.selectedIndex === null || this.selectedIndex === 0) {
          this.selectedIndex = this.matches.length - 1;
        } else {
          this.selectedIndex -= 1;
        }
        this.bestMatchIndex = null;
        this.draw();
        break;
      case "Tab":
        event.preventDefault(); // Prevent tab from moving focus
        if (this.selectedIndex !== null && this.matches.length > 0) {
          this.input.value = this.matches[this.selectedIndex].full_name; // Use the selected item
          // this.reset(); // Close the dropdown
          this.resetTableContents([this.matches[this.selectedIndex]]); // Update table with filtered matches
          this.reset();
        } else if (this.bestMatchIndex !== null && this.matches.length > 0) {
          this.input.value = this.matches[this.bestMatchIndex].full_name; // Use the best match if no selection
          // this.reset(); // Close the dropdown
          this.resetTableContents([this.matches[this.bestMatchIndex]]); // Update table with filtered matches
          this.reset();
        }
        break;

      case "Enter":
        event.preventDefault();
        if (this.selectedIndex !== null && this.matches.length > 0) {
          this.input.value = this.matches[this.selectedIndex].full_name; // Use the selected item
          // this.reset(); // Close the dropdown
          this.resetTableContents([this.matches[this.selectedIndex]]); // Update table with filtered matches
          this.reset();
        } else if (this.bestMatchIndex !== null && this.matches.length > 0) {
          this.input.value = this.matches[this.bestMatchIndex].full_name; // Use the best match if no selection
          // this.reset(); // Close the dropdown
          this.resetTableContents([this.matches[this.bestMatchIndex]]); // Update table with filtered matches
          this.reset();
        }
        break;

      case "Escape":
        this.input.value = this.previousValue;
        this.reset();
        break;
    }
  }

  handleMousedown(event) {
    let element = event.target;
    // Find the matching contact from the matches list based on the clicked item's content
    let selectedContact = this.matches.find(contact => contact.full_name === element.textContent);

    if (selectedContact) {
      // Update the input field with the selected contact's name 
      this.input.value = selectedContact.full_name;

      // Update the table with the selected contact 
      this.resetTableContents([selectedContact]);
      // Reset the autocomplete dropdown
      this.reset();
    }
  }

  async valueChanged() {
    let value = this.input.value;
    this.previousValue = value;

    if (value.length > 0) {
      this.visible = true;
      let [data] = (await Promise.allSettled([
        this.retrieveContacts(this.url)
      ])).map(resolvedPromise => resolvedPromise.value);

      // Sort the retrieved data by full_name in ascending order alphabetically
      data.sort((contact1, contact2) => {
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

      this.contacts = data;
      
      this.matches = Array.from(data).filter(contact => {
        return contact.full_name.toLowerCase().startsWith(value.toLowerCase()); // Match starting letters
      });

      this.bestMatchIndex = 0;
      this.selectedIndex = null;
      this.draw();
    } else {
      this.reset();
    }

    if (this.matches.length !== 0) {
      this.resetTableContents(this.matches);
    } else {
      this.resetTableContents(this.contacts);
    }
  }

  resetTableContents(matches) {
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
  }

  retrieveContacts(url) {
    return new Promise((resolve, reject) => {
      let request = new XMLHttpRequest();
      request.open("GET", url);
      request.responseType = "json";
      request.addEventListener("load", event => {
        if (request.status === 200) {
          resolve(request.response);
          console.log("Successfully retrieved all contact details");
        } else {
          reject("Unable to retrieve the contacts");
        }
      });
      request.send();
    });
  }

  draw() {
    while(this.listUI.lastChild) {
      this.listUI.removeChild(this.listUI.lastChild);
    }

    if (!this.visible) {
      this.overlay.textContent = "";
      return;
    }

    if (this.bestMatchIndex !== null && this.matches.length !== 0) {
      let selected = this.matches[this.bestMatchIndex];
      this.overlay.textContent = this.generateOverlayContent(this.input.value, selected);
    } else {
      this.overlay.textContent = "";
    }


    this.matches.forEach((match, index) => {
      let li = document.createElement("li");
      li.classList.add("autocomplete-ui-choice");

      if (index === this.selectedIndex) {
        li.classList.add("selected");
        this.input.value = match.full_name;
      }

      li.textContent = match.full_name;
      this.listUI.appendChild(li);
    });
  }

  reset() {
    this.visible = false;
    this.matches = [];
    this.bestMatchIndex = null;
    this.selectedIndex = null;
    this.previousValue = null;

    this.draw();
  }

  generateOverlayContent(value, match) {
    let end = match.full_name.slice(value.length);
    return value + end;
  }

  constructor(input, url) {
    this.input = input;
    this.url = url;

    this.listUI = null;
    this.overlay = null;
    
    this.visible = false;
    this.matches = [];
    this.bestMatchIndex = null;
    this.selectedIndex = null;
    this.previousValue = null;
    this.contacts = null;

    
    this.wrapInput();
    this.createUI();

    this.valueChanged = debounce(this.valueChanged.bind(this), 300);

    this.bindEvents();
    this.reset();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  let input = document.querySelector("#search_input");
  let autocomplete = new Autocomplete(input, "http://localhost:3000/api/contacts");
});