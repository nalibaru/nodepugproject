document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.button-container a.button');
  const contentContainer = document.getElementById('content-container');
  const contents = contentContainer.children;
  buttons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const actionType = button.getAttribute('data-target');
      if (actionType !== 'create' && actionType !== 'inactive')
      {
        const form = document.querySelector(`#search-form-${actionType}`);
        if (!form) {
          console.error(`Form with id search-form-${actionType} not found.`);
          return;
        }
  
        const actionTypeInput = form.querySelector(`#actiontype-${actionType}`);
        
        if (!actionTypeInput) {
          console.error(`Input with id actiontype-${actionType} not found.`);
          return;
        }
        actionTypeInput.value = actionType;
       }
     
      Array.from(contents).forEach(content => {
        content.classList.remove('active');
      });

      buttons.forEach(btn => {
        btn.classList.remove('active');
      });

      document.querySelector(`#${actionType}`).classList.add('active');
      button.classList.add('active');
      enableDiv();
      fetchInactiveUserList();
    });
  });
});

function validateUserForm(type) {
  if (type === "update")
  {
  const username = document.getElementById('update-username').value;
  const password = document.getElementById('update-password').value;
  const firstName = document.getElementById('update-firstName').value;
  const lastName = document.getElementById('update-lastName').value;
  const designation = document.getElementById('update-designation').value;
  const role = document.getElementById('update-role').value;
  const address = document.getElementById('update-address').value;
  const phoneNumber = document.getElementById('update-phoneNumber').value;
  const mailId = document.getElementById('update-mailId').value;
  const active = document.getElementById('update-active').value;
    if (!username || !password || !firstName || !lastName || !designation || !role || !address || !phoneNumber || !mailId || !active) {
      alert('Please fill in all required fields.');
      return false;
    }
  }
  else {
    const username = document.getElementById('add-username').value;
    const password = document.getElementById('add-password').value;
    const firstName = document.getElementById('add-firstName').value;
    const lastName = document.getElementById('add-lastName').value;
    const designation = document.getElementById('add-designation').value;
    const role = document.getElementById('add-role').value;
    const address = document.getElementById('add-address').value;
    const phoneNumber = document.getElementById('add-phoneNumber').value;
    const mailId = document.getElementById('add-mailId').value;
    const active = document.getElementById('add-active').value;  
    if (!username || !password || !firstName || !lastName || !designation || !role || !address || !phoneNumber || !mailId || !active) {
      alert('Please fill in all required fields.');
      return false;
    }
  }
  /* if (!username || !password || !firstName || !lastName || !designation || !role || !address || !phoneNumber || !mailId || !active) {
    alert('Please fill in all required fields.');
    return false;
  } */
  return true;
}

function validateSearchForm(val,event) {
    const value = val.split('-');
    const username = "username-" + value[2];
    const mailId = "mailId-" + value[2];
    const updatedusername = document.getElementById(username).value;
    const updatedmailId = document.getElementById(mailId).value;
  
    if (!updatedusername && !updatedmailId) {
      alert('Please fill in either the username or mail ID.');
      return false;
    }
  calSearchData(event,value[2]);
  return false;
  }
  

  function calSearchData(event, actiontype) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const params = new URLSearchParams(formData).toString();
    enableDiv();
    fetch(`/api/users/search?${params}`)
      .then(response => response.text())
      .then(html => {
        const id = "search-results-" + actiontype;
        const searchResultsContainer = document.getElementById(id);
        searchResultsContainer.innerHTML = '';
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        searchResultsContainer.appendChild(template.content.firstChild);
      })
      .catch(error => console.error('Error fetching search results:', error));
  }

function calSubmitData(event,actiontype) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  fetch(`/api/users/submit?${params}`)
    .then(response => response.json())
    .then(data => {
      const id = "search-results-" + actiontype;
      const searchResultsContainer = document.getElementById(id);
      searchResultsContainer.innerHTML = '';
      const template = document.createElement('template');
      template.innerHTML = data.html.trim();
      searchResultsContainer.appendChild(template.content.firstChild);
    })
    .catch(error => console.error('Error fetching search results:', error));
}


let currentAction = '';
let currentUser = '';

function showConfirmationModal(action, username) {
  currentAction = action;
  currentUser = username;
  document.querySelector('#confirmation-modal').classList.remove('hidden');
}

function hideModal() {
  document.querySelector('#confirmation-modal').classList.add('hidden');
}

function confirmAction() {
  if (currentAction === 'delete') {
    deleteUser(currentUser);
  } else if (currentAction === 'update') {
    updateUser(currentUser);
  }
  hideModal();
}

async function deleteUser(username) {
  try {
    const response = await fetch(`/api/users/delete/${username}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const data = await response.json(); // Corrected here to invoke the function
      const div = document.getElementById('search-results-delete');
      if (data.message) {
        const messageContent = document.querySelector('.message-content');
        messageContent.textContent = data.message;
      }
      if (div) {
        div.innerHTML = '';
      }
    } else {
      const errorData = await response.json();
      alert('Error deleting user: ' + errorData.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error deleting user: ' + error.message);
  }
}

async function deleteHardUser(username) {
  try {
    const response = await fetch(`/api/users/delete/${username}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const data = await response.json(); // Corrected here to invoke the function
      if (data.message) {
        const messageContent = document.querySelector('.message-content');
        messageContent.textContent = data.message;
      }
      fetchInactiveUserList();
    } else {
      const errorData = await response.json();
      alert('Error deleting user: ' + errorData.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error deleting user: ' + error.message);
  }
}


function updateUser(username) {
  //alert('Update user functionality triggered for user: ' + username);
  if (username) {
    fetch(`/api/users/getDetails?username=${username}`)
      .then(response => response.json())
      .then(data => {
        if (data.html) {
          hideDiv();
          document.getElementById('update-container').innerHTML = data.html;
        } else {
          alert(data.message || 'Error fetching user details');
        }
      })
      .catch(err => {
        console.error(err);
        alert('Error fetching user details');
      });
  }
}

function fetchInactiveUserList() {
  const url = `/api/users/allharddeletedetails`;
  fetch(url)
      .then(response => response.json())
      .then(data => {
          const dataContainer = document.getElementById('inactive-container');
          dataContainer.innerHTML = ''; 

          // Check if the data is empty
          if (data.length === 0) {
              dataContainer.innerHTML = `
                  <table class="mocktesttable">
                      <tr>
                          <th>User Name</th>
                          <th>Role</th>
                          <th>Created Date</th>
                          <th>Active</th>
                          <th>Deleted Status</th>
                          <th>Action</th>
                      </tr>
                      <tr id="nodata">
                          <td colspan="6">No data found.</td>
                      </tr>
                  </table>`;
              return;
          }

          // If data is present, create the table
          let detailsTable = document.createElement('table');
          detailsTable.classList.add('mocktesttable');
          detailsTable.innerHTML = `
                      <tr>
                          <th>User Name</th>
                          <th>Role</th>
                          <th>Created Date</th>
                          <th>Active</th>
                          <th>Deleted Status</th>
                          <th>Action</th>
                      </tr>
                  <tbody>
                      ${data.map(user => `
                          <tr>
                              <td>${user.username}</td>
                              <td>${user.role}</td>
                              <td>${user.createdOn}</td>
                              <td>${user.active}</td>
                              <td>${user.delete}</td>
                              <td><button class="icon-button" onclick="deleteHardUser('${user.username}')"><i class="fas fa-xmark"></i></button></td>
                          </tr>
                      `).join('')}
                  </tbody>`;
          dataContainer.appendChild(detailsTable);
      })
      .catch(err => {
          console.error('Error fetching user details:', err);
          dataContainer.innerHTML = '<p>Error fetching user details.</p>';
      });
}



function setupModal() {
  const modal = document.getElementById('confirmation-modal');
  if (!modal) {
    console.error('Modal element not found');
    return;
  }
  modal.querySelector('#cancelButton').onclick = hideModal;
  modal.querySelector('#proceedButton').onclick = confirmAction;
}

function hideDiv() {
  const div = document.getElementById('search-results-update');
  const updateDiv = document.getElementById('update-container');
  if (div || updateDiv) {
    div.style.display = 'none';
    updateDiv.style.display = 'block';
  }
}

function enableDiv() {
  const div = document.getElementById('search-results-update');
  const updateDiv = document.getElementById('update-container');
  if (div || updateDiv) {
    div.style.display = 'block';
    updateDiv.style.display = 'none';
  }
}
