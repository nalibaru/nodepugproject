function handleTypeChange() {
    const type = document.getElementById('question-type').value;
    const choicesDiv = document.getElementById('choices-div');
    const numChoicesInput = document.getElementById('num-choices');
    const choicesContainer = document.getElementById('choices-container');
    const numChoicesLabel =  document.getElementById('num-choices-label');
    const numChoices = document.getElementById('num-choices').value;
    
    choicesContainer.innerHTML = ''; // Clear previous choices

    if (type === 'MCQ' && (numChoices >= 1 && numChoices <= 10)) {
      numChoicesInput.type = 'text';
      const numChoices = numChoicesInput.value;
      for (let i = 0; i < numChoices; i++) {
        const row = document.createElement('div');
        row.className = 'choice-row';
        const input = document.createElement('input');
        input.type = 'text';
        input.name = `choice${i + 1}`;
        input.placeholder = `Choice ${i + 1}`;
        input.required = true;
         input.oninput =  function () {
          const radio = document.getElementById(`choice-radio${i + 1}`);
          radio.value = this.value;
        };
        row.appendChild(input);
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `correctChoice`;
        radio.value = `choice${i + 1}`;
        radio.id = `choice-radio${i + 1}`;
        radio.required = true;
        row.appendChild(radio);
        const label = document.createElement('label');
        label.textContent = ` Correct Choice ${i + 1}`;
        row.appendChild(label);
        choicesContainer.appendChild(row);
      }
    } else if(type === 'Desc') {
      numChoicesInput.type = 'hidden';
      numChoicesLabel.textContent = 'Enter Answer:';
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'description';
      input.placeholder = 'Enter Answer';
      input.required = true;
      choicesContainer.appendChild(input);
    } else {
      validateForm();
    }
  }

  function handleNumChoicesChange() {
    handleTypeChange();
  }

 function displayError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = message;
    errorContainer.style.display = 'block';
  } 

  function clearError() {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = '';
    errorContainer.style.display = 'none';
  }

 function validateForm(event) {
    clearError();
    const type = document.getElementById('question-type').value;
    const numChoices = document.getElementById('num-choices').value;
    const totalMarks = document.getElementById('total-marks').value;

    if (type === 'MCQ' && (numChoices < 1 || numChoices > 10)) {
      displayError("Number of choices must be between 1 and 10.");
      event.preventDefault();
      return false;
    }

    if (totalMarks < 1 && totalMarks > 200) {
      displayError("Total marks must be between 1 and 200.");
      event.preventDefault();
      return false;
    }

    if (type === 'MCQ') {
      const choices = document.getElementsByName('correctChoice');
      let selected = false;
      for (let i = 0; i < choices.length; i++) {
        if (choices[i].checked) {
          selected = true;
          break;
        }
      }
      if (!selected) {
        displayError("Please select a correct choice.");
        event.preventDefault();
        return false;
      }
    }

    return true;
 }
  
document.addEventListener('DOMContentLoaded', () => {
     alert("coming here");
     handleTypeChange();
     document.querySelector('form').addEventListener('submit', validateForm);
 });