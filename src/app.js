import { supabase } from './supabase.js';

let currentUser = null;

// --- Get current user from cookie/session ---
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
    return null;
  }
  currentUser = data.user;
  document.getElementById('user-display').textContent = currentUser?.email || 'Guest';
}

// --- Example: Load trains ---
async function loadTrains() {
  const { data: trains, error } = await supabase
    .from('trains')
    .select('*')
    .order('id', { ascending: true });

  if (error) return console.error(error);

  const tbody = document.getElementById('trains-container');
  tbody.innerHTML = '';
  trains.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.code}</td>
      <td>${t.route}</td>
      <td>${t.engineer || '-'}</td>
      <td>${t.conductor || '-'}</td>
      <td>${t.status}</td>
      <td>
        ${t.status === 'open' ? `<button class="btn-claim" data-id="${t.id}">Claim</button>` : ''}
        ${currentUser?.role === 'admin' ? `<button class="edit-btn" data-id="${t.id}">Edit</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Real-time subscription ---
supabase
  .from('trains')
  .on('*', payload => loadTrains())
  .subscribe();

// --- Initialize ---
getCurrentUser();
loadTrains();
