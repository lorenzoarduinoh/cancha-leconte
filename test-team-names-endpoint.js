// Test del endpoint de team names
console.log('🧪 Probando endpoint de team names...');

const gameId = '89aceec3-546f-443f-aaea-b56ef04f147f'; // El juego que estás usando

async function testTeamNamesEndpoint() {
  try {
    console.log(`\n📋 1. Probando GET /api/admin/games/${gameId}/team-names`);
    
    const getResponse = await fetch(`http://localhost:3001/api/admin/games/${gameId}/team-names`, {
      method: 'GET',
      headers: {
        'Cookie': 'auth-token=your-token-here' // Reemplaza con tu token si es necesario
      }
    });
    
    console.log(`Status: ${getResponse.status}`);
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('✅ GET funciona:', JSON.stringify(data, null, 2));
    } else {
      const error = await getResponse.text();
      console.log('❌ GET falló:', error);
    }
    
    console.log(`\n📋 2. Probando PATCH /api/admin/games/${gameId}/team-names`);
    
    const patchResponse = await fetch(`http://localhost:3001/api/admin/games/${gameId}/team-names`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth-token=your-token-here' // Reemplaza con tu token si es necesario
      },
      body: JSON.stringify({
        team_a_name: 'Real Madrid'
      })
    });
    
    console.log(`Status: ${patchResponse.status}`);
    
    if (patchResponse.ok) {
      const data = await patchResponse.json();
      console.log('✅ PATCH funciona:', JSON.stringify(data, null, 2));
    } else {
      const error = await patchResponse.text();
      console.log('❌ PATCH falló:', error);
    }
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
  }
}

testTeamNamesEndpoint();