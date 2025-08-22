const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kdfnqatthxutflofqzre.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZm5xYXR0aHh1dGZsb2ZxenJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQxMDU0NiwiZXhwIjoyMDcwOTg2NTQ2fQ.FsVLJm68Z2-9ndyn79bW2AJHyvzA9oXjDghf_NN7Om0'
);

async function addTestPlayers() {
  try {
    // Get the most recent game
    const { data: games } = await supabase
      .from('games')
      .select('id, title, status')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!games || games.length === 0) {
      console.log('No hay juegos');
      return;
    }

    const gameId = games[0].id;
    console.log(`Agregando jugadores al juego: ${games[0].title} (${gameId})`);

    // Test players to add
    const testPlayers = [
      { name: 'Lolo', phone: '+5491112345678' },
      { name: 'Juan', phone: '+5491123456789' },
      { name: 'Pedro', phone: '+5491134567890' },
      { name: 'Carlos', phone: '+5491145678901' }
    ];

    // Add players as registrations
    const registrations = testPlayers.map(player => ({
      game_id: gameId,
      player_name: player.name,
      player_phone: player.phone,
      payment_status: 'paid',
      team_assignment: null,
      paid_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('game_registrations')
      .insert(registrations)
      .select();

    if (error) {
      console.error('Error adding players:', error);
      return;
    }

    console.log('✅ Jugadores agregados exitosamente:');
    data.forEach(reg => {
      console.log(`- ${reg.player_name} (${reg.player_phone})`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

addTestPlayers();