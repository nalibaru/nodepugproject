function openTab(evt, tabName,name,component) {
  var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].classList.remove('active');
    }
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].classList.remove('active');
    }
  updateSessionComponent(tabName, component);
  switch (name) {
      case 'Assign Events':
      const userTableContainer = document.getElementById('user-table-container');
      userTableContainer.innerHTML = ''; 
      break;
      case 'Assigned MockTest':
      const mtuserTableContainer = document.getElementById('user-table-container');
      mtuserTableContainer.innerHTML = ''; 
      break;
      case 'Submitted MockTest':
      const mtsubmitteduserTableContainer = document.getElementById('usersubmit-table-container');
      mtsubmitteduserTableContainer.innerHTML = ''; 
      break;
  }
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
  }
  
  function checkHeight() {
    const tableContainer = document.getElementById('table-container');
    if (tableContainer) {
      if (tableContainer.scrollHeight > 900) {
        tableContainer.classList.add('scrollable');
      } else {
        tableContainer.classList.remove('scrollable');
      }
    }
  }

function updateSessionComponent(tabName, component) {
  fetch('/update-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: tabName, component: component })
  })
  .then(response => response.json())
  .catch(error => console.error('Error updating session:', error));
}

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelector('.tablink').click();
  });
  
  window.addEventListener('resize', checkHeight);
  checkHeight();