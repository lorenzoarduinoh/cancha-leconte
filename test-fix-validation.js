// Test para verificar que no se borran los nombres
console.log('🧪 Probando fix del borrado de nombres...');

const gameId = '6fccabf2-8caf-4af1-a51e-ffe3a5aeb48f';

async function testNoEraseBug() {
  try {
    // 1. Obtener estado actual
    console.log('\n📋 1. Obteniendo estado actual...');
    let response = await fetch(`http://localhost:3002/api/admin/games/${gameId}/team-names`);
    let data = await response.json();
    console.log('Estado inicial:', data.data);
    
    // 2. Actualizar solo team_a_name
    console.log('\n📋 2. Actualizando solo team_a_name a "Barcelona"...');
    response = await fetch(`http://localhost:3002/api/admin/games/${gameId}/team-names`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_a_name: 'Barcelona' })
    });
    
    if (response.ok) {
      data = await response.json();
      console.log('✅ Resultado:', data.data);
      
      if (data.data.team_b_name && data.data.team_b_name !== 'Equipo B') {
        console.log('🎉 ¡ÉXITO! team_b_name se mantuvo:', data.data.team_b_name);
      } else {
        console.log('❌ FALLÓ: team_b_name se perdió o reseteo');
      }
    } else {
      console.log('❌ Error en PATCH:', await response.text());
    }
    
    // 3. Actualizar solo team_b_name
    console.log('\n📋 3. Actualizando solo team_b_name a "Valencia"...');
    response = await fetch(`http://localhost:3002/api/admin/games/${gameId}/team-names`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_b_name: 'Valencia' })
    });
    
    if (response.ok) {
      data = await response.json();
      console.log('✅ Resultado:', data.data);
      
      if (data.data.team_a_name === 'Barcelona') {
        console.log('🎉 ¡ÉXITO! team_a_name se mantuvo como Barcelona');
      } else {
        console.log('❌ FALLÓ: team_a_name se perdió:', data.data.team_a_name);
      }
    } else {
      console.log('❌ Error en PATCH:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNoEraseBug();