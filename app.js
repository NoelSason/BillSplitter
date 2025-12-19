// ============================================
// STATE MANAGEMENT
// ============================================
let state = {
  people: [],
  items: [],
  tax: 0,
  tip: 0,
  tipType: 'percent', // 'percent' or 'dollar'
  assignments: {} // { itemId: [personIds] }
};

// ============================================
// PERSON MANAGEMENT
// ============================================
function addPerson() {
  const input = document.getElementById('personNameInput');
  const name = input.value.trim();

  if (!name) {
    alert('Please enter a person\'s name');
    return;
  }

  if (state.people.find(p => p.name.toLowerCase() === name.toLowerCase())) {
    alert('This person is already added');
    return;
  }

  const person = {
    id: Date.now().toString(),
    name: name
  };

  state.people.push(person);
  input.value = '';

  renderPeople();
  renderItems(); // Re-render items to show new person in assignment options
  calculateSummary();
}

function removePerson(personId) {
  state.people = state.people.filter(p => p.id !== personId);

  // Remove person from all assignments
  Object.keys(state.assignments).forEach(itemId => {
    state.assignments[itemId] = state.assignments[itemId].filter(id => id !== personId);
  });

  renderPeople();
  renderItems();
  calculateSummary();
}

function renderPeople() {
  const container = document.getElementById('peopleList');

  if (state.people.length === 0) {
    container.innerHTML = '<p class="text-muted">No people added yet</p>';
    return;
  }

  container.innerHTML = state.people.map(person => `
    <div class="person-chip">
      <span>${person.name}</span>
      <button class="remove-btn" onclick="removePerson('${person.id}')" title="Remove ${person.name}">
        ×
      </button>
    </div>
  `).join('');
}

// ============================================
// ITEM MANAGEMENT
// ============================================
function addItem() {
  const nameInput = document.getElementById('itemNameInput');
  const priceInput = document.getElementById('itemPriceInput');

  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);

  if (!name) {
    alert('Please enter an item name');
    return;
  }

  if (isNaN(price) || price <= 0) {
    alert('Please enter a valid price');
    return;
  }

  const item = {
    id: Date.now().toString(),
    name: name,
    price: price
  };

  state.items.push(item);
  state.assignments[item.id] = [];

  nameInput.value = '';
  priceInput.value = '';

  renderItems();
  calculateSummary();
}

function removeItem(itemId) {
  state.items = state.items.filter(item => item.id !== itemId);
  delete state.assignments[itemId];

  renderItems();
  calculateSummary();
}

function togglePersonForItem(itemId, personId) {
  if (!state.assignments[itemId]) {
    state.assignments[itemId] = [];
  }

  const index = state.assignments[itemId].indexOf(personId);

  if (index === -1) {
    state.assignments[itemId].push(personId);
  } else {
    state.assignments[itemId].splice(index, 1);
  }

  renderItems();
  calculateSummary();
}

function renderItems() {
  const container = document.getElementById('itemsList');

  if (state.items.length === 0) {
    container.innerHTML = '<p class="text-muted">No items added yet</p>';
    return;
  }

  container.innerHTML = state.items.map(item => {
    const assignedPeople = state.assignments[item.id] || [];

    return `
      <li class="item">
        <div class="item-header">
          <span class="item-name">${item.name}</span>
          <span class="item-price">$${item.price.toFixed(2)}</span>
        </div>
        
        ${state.people.length > 0 ? `
          <div style="margin-top: 0.75rem;">
            <label class="input-label" style="margin-bottom: 0.5rem;">Assign to:</label>
            <div class="person-chips">
              ${state.people.map(person => {
      const isSelected = assignedPeople.includes(person.id);
      return `
                  <div 
                    class="person-chip ${isSelected ? 'selected' : ''}" 
                    onclick="togglePersonForItem('${item.id}', '${person.id}')"
                    style="cursor: pointer;"
                  >
                    ${person.name}
                  </div>
                `;
    }).join('')}
            </div>
          </div>
        ` : '<p class="text-muted" style="font-size: 0.875rem; margin-top: 0.5rem;">Add people to assign this item</p>'}
        
        <div class="item-actions">
          <button class="btn btn-danger btn-small" onclick="removeItem('${item.id}')">
            Remove Item
          </button>
        </div>
      </li>
    `;
  }).join('');
}

// ============================================
// CALCULATION ENGINE
// ============================================
function calculateSummary() {
  const taxInput = document.getElementById('taxInput');
  const tipInput = document.getElementById('tipInput');

  state.tax = parseFloat(taxInput.value) || 0;
  state.tip = parseFloat(tipInput.value) || 0;

  if (state.people.length === 0 || state.items.length === 0) {
    document.getElementById('summaryContainer').innerHTML =
      '<p class="text-muted text-center">Add people and items to see the split breakdown</p>';
    document.getElementById('copyButton').style.display = 'none';
    return;
  }

  // Calculate each person's subtotal
  const personSubtotals = {};
  state.people.forEach(person => {
    personSubtotals[person.id] = 0;
  });

  // Distribute item costs
  state.items.forEach(item => {
    const assignedPeople = state.assignments[item.id] || [];

    if (assignedPeople.length > 0) {
      const pricePerPerson = item.price / assignedPeople.length;
      assignedPeople.forEach(personId => {
        personSubtotals[personId] += pricePerPerson;
      });
    }
  });

  // Calculate total subtotal
  const totalSubtotal = Object.values(personSubtotals).reduce((sum, val) => sum + val, 0);

  // Calculate total tax and tip amounts
  const totalTaxAmount = totalSubtotal * (state.tax / 100);

  // Calculate tip based on type
  let totalTipAmount;
  if (state.tipType === 'percent') {
    totalTipAmount = totalSubtotal * (state.tip / 100);
  } else {
    totalTipAmount = state.tip; // Dollar amount
  }

  // Calculate each person's share
  const personSummaries = state.people.map(person => {
    const subtotal = personSubtotals[person.id];
    const proportion = totalSubtotal > 0 ? subtotal / totalSubtotal : 0;
    const taxAmount = totalTaxAmount * proportion;
    const tipAmount = totalTipAmount * proportion;
    const total = subtotal + taxAmount + tipAmount;

    return {
      person,
      subtotal,
      taxAmount,
      tipAmount,
      total
    };
  });

  renderSummary(personSummaries, totalSubtotal, totalTaxAmount, totalTipAmount);
}

function renderSummary(personSummaries, totalSubtotal, totalTaxAmount, totalTipAmount) {
  const container = document.getElementById('summaryContainer');
  const copyButton = document.getElementById('copyButton');

  const grandTotal = totalSubtotal + totalTaxAmount + totalTipAmount;

  // Format tip display based on type
  const tipDisplay = state.tipType === 'percent'
    ? `Tip (${state.tip}%):`
    : `Tip ($${state.tip.toFixed(2)}):`;

  const summaryHTML = `
    <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
      <div class="flex-between" style="margin-bottom: 0.5rem;">
        <span class="text-secondary">Subtotal:</span>
        <span style="font-weight: 600;">$${totalSubtotal.toFixed(2)}</span>
      </div>
      <div class="flex-between" style="margin-bottom: 0.5rem;">
        <span class="text-secondary">Tax (${state.tax}%):</span>
        <span style="font-weight: 600;">$${totalTaxAmount.toFixed(2)}</span>
      </div>
      <div class="flex-between" style="margin-bottom: 0.5rem;">
        <span class="text-secondary">${tipDisplay}</span>
        <span style="font-weight: 600;">$${totalTipAmount.toFixed(2)}</span>
      </div>
      <div class="flex-between" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
        <span style="font-weight: 600; font-size: 1.1rem;">Grand Total:</span>
        <span style="font-weight: 700; font-size: 1.25rem; background: var(--success-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">$${grandTotal.toFixed(2)}</span>
      </div>
    </div>
    
    <h4 style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 1px;">Individual Breakdown</h4>
    
    <div class="summary-grid">
      ${personSummaries.map(summary => `
        <div class="summary-card">
          <div class="summary-person">${summary.person.name}</div>
          <div class="summary-breakdown">Subtotal: $${summary.subtotal.toFixed(2)}</div>
          <div class="summary-breakdown">Tax: $${summary.taxAmount.toFixed(2)}</div>
          <div class="summary-breakdown">Tip: $${summary.tipAmount.toFixed(2)}</div>
          <div class="summary-total">$${summary.total.toFixed(2)}</div>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = summaryHTML;
  copyButton.style.display = 'block';
}

// ============================================
// TIP TYPE HANDLING
// ============================================
function handleTipTypeChange() {
  const selectedType = document.querySelector('input[name="tipType"]:checked').value;
  state.tipType = selectedType;

  const tipInput = document.getElementById('tipInput');

  // Update placeholder based on type
  if (selectedType === 'percent') {
    tipInput.placeholder = '18';
    tipInput.step = '0.1';
  } else {
    tipInput.placeholder = '10.00';
    tipInput.step = '0.01';
  }

  // Reset tip value when switching types
  tipInput.value = '0';
  state.tip = 0;

  calculateSummary();
}

// ============================================
// COPY FUNCTIONALITY
// ============================================
function copySummary() {
  if (state.people.length === 0 || state.items.length === 0) {
    return;
  }

  // Calculate totals
  const personSubtotals = {};
  state.people.forEach(person => {
    personSubtotals[person.id] = 0;
  });

  state.items.forEach(item => {
    const assignedPeople = state.assignments[item.id] || [];
    if (assignedPeople.length > 0) {
      const pricePerPerson = item.price / assignedPeople.length;
      assignedPeople.forEach(personId => {
        personSubtotals[personId] += pricePerPerson;
      });
    }
  });

  const totalSubtotal = Object.values(personSubtotals).reduce((sum, val) => sum + val, 0);
  const totalTaxAmount = totalSubtotal * (state.tax / 100);

  let totalTipAmount;
  if (state.tipType === 'percent') {
    totalTipAmount = totalSubtotal * (state.tip / 100);
  } else {
    totalTipAmount = state.tip;
  }

  const grandTotal = totalSubtotal + totalTaxAmount + totalTipAmount;

  // Build text summary
  let summaryText = '=== BILL SPLIT SUMMARY ===\n\n';

  // Overall totals
  summaryText += `Subtotal: $${totalSubtotal.toFixed(2)}\n`;
  summaryText += `Tax (${state.tax}%): $${totalTaxAmount.toFixed(2)}\n`;

  if (state.tipType === 'percent') {
    summaryText += `Tip (${state.tip}%): $${totalTipAmount.toFixed(2)}\n`;
  } else {
    summaryText += `Tip ($${state.tip.toFixed(2)}): $${totalTipAmount.toFixed(2)}\n`;
  }

  summaryText += `Grand Total: $${grandTotal.toFixed(2)}\n\n`;

  // Individual breakdown
  summaryText += '--- INDIVIDUAL BREAKDOWN ---\n\n';

  state.people.forEach(person => {
    const subtotal = personSubtotals[person.id];
    const proportion = totalSubtotal > 0 ? subtotal / totalSubtotal : 0;
    const taxAmount = totalTaxAmount * proportion;
    const tipAmount = totalTipAmount * proportion;
    const total = subtotal + taxAmount + tipAmount;

    summaryText += `${person.name}:\n`;
    summaryText += `  Subtotal: $${subtotal.toFixed(2)}\n`;
    summaryText += `  Tax: $${taxAmount.toFixed(2)}\n`;
    summaryText += `  Tip: $${tipAmount.toFixed(2)}\n`;
    summaryText += `  Total: $${total.toFixed(2)}\n\n`;
  });

  // Copy to clipboard
  navigator.clipboard.writeText(summaryText).then(() => {
    // Visual feedback
    const button = document.getElementById('copyButton');
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.background = 'var(--success-gradient)';

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  }).catch(err => {
    alert('Failed to copy to clipboard');
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function resetAll() {
  if (!confirm('Are you sure you want to reset everything? This cannot be undone.')) {
    return;
  }

  state = {
    people: [],
    items: [],
    tax: 0,
    tip: 0,
    tipType: 'percent',
    assignments: {}
  };

  document.getElementById('taxInput').value = '0';
  document.getElementById('tipInput').value = '0';
  document.querySelector('input[name="tipType"][value="percent"]').checked = true;

  renderPeople();
  renderItems();
  calculateSummary();
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.getElementById('personNameInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addPerson();
  }
});

document.getElementById('itemNameInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('itemPriceInput').focus();
  }
});

document.getElementById('itemPriceInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addItem();
  }
});

// ============================================
// INITIALIZATION
// ============================================
renderPeople();
renderItems();
calculateSummary();
