/**
 * Consumet Diagnostics
 * Run in browser console to diagnose Consumet API issues
 */

async function diagnoseConsumet() {
  console.log('🔍 CONSUMET DIAGNOSTICS\n');
  console.log('═'.repeat(50));
  
  // Check 1: Test Vercel API
  console.log('\n1️⃣ Checking Vercel Consumet API...');
  const apiUrl = 'https://apiconsumet-hdnywn99o-jeetrana1s-projects.vercel.app';
  
  try {
    const response = await fetch(apiUrl, { method: 'HEAD' });
    console.log(`   ✓ API is responding (Status: ${response.status})`);
  } catch (e) {
    console.log(`   ✗ API is NOT responding`);
    console.log(`   Error: ${e.message}`);
    return;
  }
  
  // Check 2: Try different API endpoints (v3+ structure)
  console.log('\n2️⃣ Testing API endpoints...');
  const endpoints = [
    `${apiUrl}/movies/flixhq`,
    `${apiUrl}/meta/tmdb`,
    `${apiUrl}/anime/gogoanime`,
    apiUrl
  ];
  
  let workingEndpoint = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        console.log(`   ✓ Working endpoint found: ${endpoint}`);
        workingEndpoint = endpoint;
        break;
      } else {
        console.log(`   • ${endpoint} - Status: ${response.status}`);
      }
    } catch (e) {
      console.log(`   • ${endpoint} - Failed to reach`);
    }
  }
  
  if (!workingEndpoint) {
    console.log('\n   ⚠️  No working endpoints found!');
    console.log('\n   Visit the API in browser to see available endpoints');
    console.log(`   ${apiUrl}`);
    return;
  }
  
  // Check 3: Test search functionality
  console.log('\n3️⃣ Testing search...');
  const searchUrl = `${workingEndpoint}/search?query=Batman`;
  console.log(`   Testing: ${searchUrl}`);
  try {
    const response = await fetch(searchUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        console.log(`   ✓ Search works! Found ${data.results.length} results`);
        console.log(`   Sample: ${data.results[0].title}`);
      } else {
        console.log(`   • Search returned no results`);
      }
    } else {
      console.log(`   ✗ Search failed (Status: ${response.status})`);
    }
  } catch (e) {
    console.log(`   ✗ Search error: ${e.message}`);
  }
  
  // Check 4: Test consumet-provider.js
  console.log('\n4️⃣ Testing consumet-provider.js...');
  if (window.consumetProvider) {
    console.log(`   ✓ window.consumetProvider is available`);
    console.log(`   Functions: ${Object.keys(window.consumetProvider).join(', ')}`);
  } else {
    console.log(`   ✗ window.consumetProvider is NOT loaded`);
  }
  
  // Check 5: Test auto-detection
  console.log('\n5️⃣ Testing auto-detection...');
  if (window.consumetProvider && window.consumetProvider.detectConsumetVersion) {
    try {
      const detected = await window.consumetProvider.detectConsumetVersion();
      console.log(`   ✓ Auto-detected: ${detected}`);
    } catch (e) {
      console.log(`   ✗ Auto-detection failed: ${e.message}`);
    }
  }
  
  console.log('\n═'.repeat(50));
  console.log('\n✅ DIAGNOSTICS COMPLETE\n');
  
  if (workingEndpoint) {
    console.log('🎯 Recommended Action:');
    console.log(`   The API is working at: ${workingEndpoint}`);
    console.log(`   Try playing a movie now!`);
  } else {
    console.log('🚨 Recommended Action:');
    console.log(`   1. Verify Consumet is actually running`);
    console.log(`   2. Check the correct API endpoint structure`);
    console.log(`   3. Update CONSUMET_API_VERSIONS if different`);
  }
}

// Run diagnostics
console.log('Starting diagnostics...\n');
diagnoseConsumet().then(() => {
  console.log('You can run this again by typing: diagnoseConsumet()');
}).catch(err => {
  console.error('Diagnostic error:', err);
});
