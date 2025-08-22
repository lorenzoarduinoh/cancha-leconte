// Test del endpoint individual de games
console.log('🧪 Probando endpoint individual de games...');

const gameId = '89aceec3-546f-443f-aaea-b56ef04f147f';

async function testIndividualGameEndpoint() {
  try {
    console.log(`\n📋 Probando GET /api/admin/games/${gameId}`);
    
    const response = await fetch(`http://localhost:3001/api/admin/games/${gameId}`, {
      method: 'GET'
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Funciona!');
      console.log('Full data structure:', JSON.stringify(data, null, 2));
      const gameData = data.data.data; // El juego está en data.data.data
      console.log(`Team A Name: "${gameData.team_a_name}"`);
      console.log(`Team B Name: "${gameData.team_b_name}"`);
      
      if (gameData.team_a_name === 'Real Madrid') {
        console.log('🎉 ¡Los nombres personalizados se están devolviendo correctamente!');
      } else {
        console.log('⚠️  Aún devuelve nombres por defecto');
      }
    } else {
      const error = await response.text();
      console.log('❌ Falló:', error);
    }
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
  }
}

testIndividualGameEndpoint();