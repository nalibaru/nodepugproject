function validateForm() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
  
    if (!username || !password) {
      alert('Please fill in both fields.');
      return false;
    }
    return true;
  }