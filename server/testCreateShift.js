// quick test script to reproduce shift creation error
// uses global fetch provided by Node.js

const base = 'http://localhost:5000/api';

async function main() {
  let token;
  try {
    const reg = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ firstName:'Test', lastName:'User', email:'test1@example.com', password:'pass1234', role:'SUPERVISOR' })
    });
    const regData = await reg.json();
    console.log('register', reg.status, regData);
  } catch(e) { console.error('register failed', e); }
  try {
    const login = await fetch(`${base}/auth/login`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email:'test1@example.com', password:'pass1234' })
    });
    const loginData = await login.json();
    console.log('login', login.status, loginData);
    token = loginData.token;
  } catch(e){console.error('login failed', e);}  
  if (!token) return;

  // first, create a shift in the previous pay period (mid–Jan 2026)
  try {
    const prevStart = new Date('2026-01-20T08:00:00Z');
    const prevEnd = new Date(prevStart.getTime() + 3600000);
    const res1 = await fetch(`${base}/guards/shifts`, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body: JSON.stringify({ locationId:'000000000000000000000000', startDateTime:prevStart.toISOString(), endDateTime:prevEnd.toISOString() })
    });
    console.log('prev shift create', res1.status, await res1.text());
  } catch(e){console.error('prev shift error',e);}  

  // now attempt a shift in the new period (Feb 1)
  try {
    const newStart = new Date('2026-02-01T08:00:00Z');
    const newEnd = new Date(newStart.getTime() + 3600000);
    const res2 = await fetch(`${base}/guards/shifts`, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body: JSON.stringify({ locationId:'000000000000000000000000', startDateTime:newStart.toISOString(), endDateTime:newEnd.toISOString() })
    });
    console.log('new shift create', res2.status, await res2.text());
    if (res2.status === 403) {
      console.log('correctly blocked with 403');
    }
  } catch(e){console.error('new shift error',e);}  
}

main();
