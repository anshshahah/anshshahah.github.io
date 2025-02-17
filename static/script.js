// Utility function to display results.
function displayResult(elementId, message, type) {
  const resultDiv = document.getElementById(elementId);
  resultDiv.innerHTML = `
    <div class="alert alert-${type}" role="alert">
      ${message}
    </div>
  `;
}

// Parse race data from a hidden element.
const raceData = JSON.parse(document.getElementById('raceData').getAttribute('data-race'));

// Load Kelly Fraction and Bankroll from localStorage
const loadSettings = () => {
  const kellyFraction = localStorage.getItem('kellyFraction');
  const bankroll = localStorage.getItem('bankroll');
  if (kellyFraction) document.querySelectorAll('.kelly-fraction').forEach(el => el.value = kellyFraction);
  if (bankroll) document.querySelectorAll('.bankroll').forEach(el => el.value = bankroll);
};

// Save Kelly Fraction and Bankroll to localStorage
const saveSettings = () => {
  const kellyFraction = document.querySelector('.kelly-fraction').value;
  const bankroll = document.querySelector('.bankroll').value;
  localStorage.setItem('kellyFraction', kellyFraction);
  localStorage.setItem('bankroll', bankroll);
};

// Load settings when the page loads
loadSettings();

// Synchronize all shared Bankroll fields
document.querySelectorAll('.bankroll').forEach(function(field) {
  field.addEventListener('input', function() {
    const value = this.value;
    document.querySelectorAll('.bankroll').forEach(function(el) {
      if (el !== field) {
        el.value = value;
      }
    });
    saveSettings();
  });
});

// Synchronize all shared Kelly Fraction fields
document.querySelectorAll('.kelly-fraction').forEach(function(field) {
  field.addEventListener('input', function() {
    const value = this.value;
    document.querySelectorAll('.kelly-fraction').forEach(function(el) {
      if (el !== field) {
        el.value = value;
      }
    });
    saveSettings();
  });
});

/* ================================
   Original Kelly Bet Calculator
=================================== */
document.getElementById('kellyBetForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const kellyFraction = parseFloat(document.querySelector('.kelly-fraction').value);
  const bookieOdds = parseFloat(document.getElementById('bookieOdds').value);
  const bankroll = parseFloat(document.querySelector('.bankroll').value);
  const selectedDogIndex = parseInt(document.getElementById('dogSelect').value);

  // Get true odds from selected dog
  const trueOdds = parseFloat(raceData.runners[selectedDogIndex].model_odds);

  // Input Validation
  if (isNaN(kellyFraction) || isNaN(bookieOdds) || isNaN(bankroll)) {
    displayResult('kellyResult', 'Please enter valid numbers.', 'danger');
    return;
  }

  if (kellyFraction < 0 || kellyFraction > 1) {
    displayResult('kellyResult', 'Kelly Fraction must be between 0 and 1.', 'danger');
    return;
  }

  if (bookieOdds <= 1 || trueOdds <= 1) {
    displayResult('kellyResult', 'Bookie Odds and True Odds must be greater than 1.', 'danger');
    return;
  }

  if (bankroll <= 0) {
    displayResult('kellyResult', 'Please enter a valid Bankroll greater than 0.', 'danger');
    return;
  }

  // Standard Kelly formula: f* = (b*p - q) / b, where p = 1/trueOdds and b = bookieOdds - 1.
  const p = 1 / trueOdds;
  const q = 1 - p;
  const b = bookieOdds - 1;
  const f_star = (b * p - q) / b;

  if (f_star <= 0) {
    displayResult('kellyResult', 'The calculated bet suggests not to bet.', 'warning');
    return;
  }

  // Multiply by the Kelly Fraction provided.
  const f = f_star * kellyFraction;
  const amountToBet = (f * bankroll).toFixed(2);

  // Calculate profit: (Bookie Odds × Stake) - Stake
  const profit = ((bookieOdds * amountToBet) - amountToBet).toFixed(2);

  const selectedRunner = raceData.runners[selectedDogIndex];
  displayResult(
    'kellyResult',
    `<strong>${selectedRunner.name}</strong><br>
     Amount To Bet: <strong>$${amountToBet}</strong><br>
     Potential Profit: <strong>$${profit}</strong>`,
    'info'
  );
});

document.getElementById('kellyBetForm').addEventListener('reset', function(e) {
  e.preventDefault();
  document.getElementById('bookieOdds').value = '';
  document.getElementById('dogSelect').value = -1;
  document.getElementById('kellyResult').innerHTML = '';
});

// Win Button for Original Kelly Calculator
document.getElementById('kellyWinButton').addEventListener('click', function() {
  const bankroll = parseFloat(document.querySelector('.bankroll').value);
  // Use the global flag to get all currency values (bet amount and profit)
  const matches = document.getElementById('kellyResult').innerText.match(/\$\d+\.\d{2}/g);
  // Check if there are at least two matches before proceeding
  if (matches && matches.length >= 2) {
    const profit = parseFloat(matches[1].replace('$', ''));
    if (!isNaN(profit)) {
      const newBankroll = bankroll + profit;
      document.querySelectorAll('.bankroll').forEach(el => el.value = newBankroll.toFixed(2));
      saveSettings();
    }
  }
  document.getElementById('bookieOdds').value = '';
  document.getElementById('dogSelect').value = -1;
  document.getElementById('kellyResult').innerHTML = '';
});


// Loss Button for Original Kelly Calculator
document.getElementById('kellyLossButton').addEventListener('click', function() {
  const bankroll = parseFloat(document.querySelector('.bankroll').value);
  const amountToBet = parseFloat(document.getElementById('kellyResult').innerText.match(/\$\d+\.\d{2}/)[0].replace('$', ''));
  if (!isNaN(amountToBet)) {
    const newBankroll = bankroll - amountToBet;
    document.querySelectorAll('.bankroll').forEach(el => el.value = newBankroll.toFixed(2));
    saveSettings();
  }
  document.getElementById('bookieOdds').value = '';
  document.getElementById('dogSelect').value = -1;
  document.getElementById('kellyResult').innerHTML = '';
});

/* ================================
   Betfair Back Kelly Bet Calculator
=================================== */
document.getElementById('betfairBackForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const kellyFraction = parseFloat(document.querySelector('.kelly-fraction').value);
  const bookieOdds = parseFloat(document.getElementById('backBookieOdds').value);
  const bankroll = parseFloat(document.querySelector('.bankroll').value);
  const selectedDogIndex = parseInt(document.getElementById('backDogSelect').value);

  // Get true odds from selected dog
  const trueOdds = parseFloat(raceData.runners[selectedDogIndex].model_odds);

  // Input validation
  if (isNaN(kellyFraction) || isNaN(bookieOdds) || isNaN(bankroll)) {
    displayResult('betfairBackResult', 'Please enter valid numbers.', 'danger');
    return;
  }

  if (kellyFraction < 0 || kellyFraction > 1) {
    displayResult('betfairBackResult', 'Kelly Fraction must be between 0 and 1.', 'danger');
    return;
  }

  if (bookieOdds <= 1 || trueOdds <= 1) {
    displayResult('betfairBackResult', 'Bookie Odds and True Odds must be greater than 1.', 'danger');
    return;
  }

  if (bankroll <= 0) {
    displayResult('betfairBackResult', 'Please enter a valid Bankroll greater than 0.', 'danger');
    return;
  }

    // For a back bet, calculate only if: True Odds < 1 + 0.93*(Bookie Odds - 1)
    if (trueOdds >= 1 + 0.93 * (bookieOdds - 1)) {
      displayResult('betfairBackResult', 'No favorable back bet is suggested.', 'warning');
      return;
    }
  
    // p = 1/trueOdds and Back bet Kelly formula:
    // f* = (p*(1+0.93*(bookieOdds-1)) - 1) / (0.93*(bookieOdds-1))
    const p = 1 / trueOdds;
    const f_star = (p * (1 + 0.93 * (bookieOdds - 1)) - 1) / (0.93 * (bookieOdds - 1));
    const f = Math.max(f_star, 0) * kellyFraction;
    const amountToBet = (f * bankroll).toFixed(2);
  
    // Calculate profit: (Bookie Odds × Stake) - Stake
    const profit = (bookieOdds * amountToBet - amountToBet).toFixed(2);
  
    const selectedRunner = raceData.runners[selectedDogIndex];
    displayResult(
      'betfairBackResult',
      `<strong>${selectedRunner.name}</strong><br>
       Amount To Bet: <strong>$${amountToBet}</strong><br>
       Potential Profit: <strong>$${profit}</strong>`,
      'info'
    );
  });
  
  document.getElementById('betfairBackForm').addEventListener('reset', function(e) {
    e.preventDefault();
    document.getElementById('backBookieOdds').value = '';
    document.getElementById('backDogSelect').value = -1;
    document.getElementById('betfairBackResult').innerHTML = '';
  });
  
  // Win Button for Betfair Back Calculator
  document.getElementById('backWinButton').addEventListener('click', function() {
    const bankroll = parseFloat(document.querySelector('.bankroll').value);
    const matches = document.getElementById('betfairBackResult').innerText.match(/\$\d+\.\d{2}/g);
    if (matches && matches.length >= 2) {
      const profit = parseFloat(matches[1].replace('$', ''));
      if (!isNaN(profit)) {
        const newBankroll = bankroll + profit;
        document.querySelectorAll('.bankroll').forEach(el => el.value = newBankroll.toFixed(2));
        saveSettings();
      }
    }
    document.getElementById('backBookieOdds').value = '';
    document.getElementById('backDogSelect').value = -1;
    document.getElementById('betfairBackResult').innerHTML = '';
  });
  
  
  // Loss Button for Betfair Back Calculator
  document.getElementById('backLossButton').addEventListener('click', function() {
    const bankroll = parseFloat(document.querySelector('.bankroll').value);
    const amountToBet = parseFloat(document.getElementById('betfairBackResult').innerText.match(/\$\d+\.\d{2}/)[0].replace('$', ''));
    if (!isNaN(amountToBet)) {
      const newBankroll = bankroll - amountToBet;
      document.querySelectorAll('.bankroll').forEach(el => el.value = newBankroll.toFixed(2));
      saveSettings();
    }
    document.getElementById('backBookieOdds').value = '';
    document.getElementById('backDogSelect').value = -1;
    document.getElementById('betfairBackResult').innerHTML = '';
  });
  
  /* ================================
     Betfair Lay Kelly Bet Calculator
  =================================== */
  document.getElementById('betfairLayForm').addEventListener('submit', function(e) {
    e.preventDefault();
  
    const kellyFraction = parseFloat(document.querySelector('.kelly-fraction').value);
    const bookieOdds = parseFloat(document.getElementById('layBookieOdds').value);
    const bankroll = parseFloat(document.querySelector('.bankroll').value);
    const selectedDogIndex = parseInt(document.getElementById('layDogSelect').value);
  
    // Get true odds from selected dog
    const trueOdds = parseFloat(raceData.runners[selectedDogIndex].model_odds);
  
    // Commission on winnings:
    const c = 0.05; // 5% commission
    const oneMinusC = 1 - c; // 0.95
  
    // Basic input validation:
    if (isNaN(kellyFraction) || isNaN(bookieOdds) || isNaN(bankroll)) {
      displayResult('betfairLayResult', 'Please enter valid numbers.', 'danger');
      return;
    }
    if (kellyFraction < 0 || kellyFraction > 1) {
      displayResult('betfairLayResult', 'Kelly Fraction must be between 0 and 1.', 'danger');
      return;
    }
    if (bookieOdds <= 1 || trueOdds <= 1) {
      displayResult('betfairLayResult', 'Bookie Odds and True Odds must be greater than 1.', 'danger');
      return;
    }
    if (bankroll <= 0) {
      displayResult('betfairLayResult', 'Please enter a valid Bankroll greater than 0.', 'danger');
      return;
    }
  
    // Calculate winning probability based on true odds.
    const p = 1 / trueOdds;
  
    // A favorable lay bet requires:
    //   (1-p)*(1-c) > p*(bookieOdds-1)
    if ((1 - p) * oneMinusC <= p * (bookieOdds - 1)) {
      displayResult('betfairLayResult', 'No favorable lay bet is suggested.', 'warning');
      return;
    }
  
    // Calculate the commission-adjusted optimal Kelly fraction for a lay bet:
    // f* = [ (1-p)*(1-c) - p*(bookieOdds-1) ] / [ (bookieOdds-1)*(1-c) ]
    const f_star = (((1 - p) * oneMinusC) - (p * (bookieOdds - 1))) / ((bookieOdds - 1) * oneMinusC);
  
    // Scale the fraction by your chosen Kelly fraction
    const f = Math.max(f_star, 0) * kellyFraction;
  
    // Effective stake is what you offer as your lay stake (the backer's stake):
    const stake = (f * bankroll).toFixed(2);
    // Liability is the amount you must pay if the selection wins:
    const liability = (stake * (bookieOdds - 1)).toFixed(2);
    // Profit if the selection loses (after commission):
    const profit = (stake * oneMinusC).toFixed(2);
  
    const selectedRunner = raceData.runners[selectedDogIndex];
    displayResult(
      'betfairLayResult',
      `<strong>${selectedRunner.name}</strong><br>
       Backer's Stake: <strong>$${stake}</strong><br>
       Liability: <strong>$${liability}</strong><br>
       Profit if Loses: <strong>$${profit}</strong>`,
      'info'
    );
  });
  
  document.getElementById('betfairLayForm').addEventListener('reset', function(e) {
    e.preventDefault();
    document.getElementById('layBookieOdds').value = '';
    document.getElementById('layDogSelect').value = -1;
    document.getElementById('betfairLayResult').innerHTML = '';
  });
  
  // Win Button for Betfair Lay Calculator
  document.getElementById('layWinButton').addEventListener('click', function() {
    const bankroll = parseFloat(document.querySelector('.bankroll').value);
    const profit = parseFloat(document.getElementById('betfairLayResult').innerText.match(/\$\d+\.\d{2}/)[0].replace('$', ''));
    if (!isNaN(profit)) {
      const newBankroll = bankroll + profit;
      document.querySelectorAll('.bankroll').forEach(el => el.value = newBankroll.toFixed(2));
      saveSettings();
    }
    document.getElementById('layBookieOdds').value = '';
    document.getElementById('layDogSelect').value = -1;
    document.getElementById('betfairLayResult').innerHTML = '';
  });
  
  // Loss Button for Betfair Lay Calculator
  document.getElementById('layLossButton').addEventListener('click', function() {
    const bankroll = parseFloat(document.querySelector('.bankroll').value);
    const amountToBet = parseFloat(document.getElementById('betfairLayResult').innerText.match(/\$\d+\.\d{2}/)[0].replace('$', ''));
    if (!isNaN(amountToBet)) {
      const newBankroll = bankroll - amountToBet;
      document.querySelectorAll('.bankroll').forEach(el => el.value = newBankroll.toFixed(2));
      saveSettings();
    }
    document.getElementById('layBookieOdds').value = '';
    document.getElementById('layDogSelect').value = -1;
    document.getElementById('betfairLayResult').innerHTML = '';
  });