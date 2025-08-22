const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestData() {
  try {
    // 0. Obtener un admin user existente
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1)
      .single();

    if (!adminUser) {
      console.error('No admin users found');
      return;
    }

    // 1. Crear juego de prueba
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert([{
        title: 'Partido de Prueba - Sábado',
        description: 'Partido para testear el sistema de gestión personal',
        game_date: '2025-08-23T18:00:00Z',
        min_players: 10,
        max_players: 20,
        field_cost_per_player: 25.00,
        game_duration_minutes: 90,
        status: 'open',
        created_by: adminUser.id
      }])
      .select()
      .single();

    if (gameError) {
      console.error('Error creating game:', gameError);
      return;
    }

    console.log('✅ Juego creado:', game.title);

    // 2. Crear registro con token manual 
    const manualToken = require('crypto').randomBytes(32).toString('hex');
    
    const { data: registration, error: regError } = await supabase
      .from('game_registrations')
      .insert([{
        game_id: game.id,
        player_name: 'Juan Pérez Test',
        player_phone: '+5491123456789',
        payment_status: 'paid',
        payment_amount: 25.00,
        notification_status: 'pending',
        registration_token: manualToken
      }])
      .select()
      .single();

    if (regError) {
      console.error('Error creating registration:', regError);
      return;
    }

    console.log('✅ Registro creado para:', registration.player_name);
    console.log('🔑 Token:', registration.registration_token);
    console.log('🔑 Token length:', registration.registration_token?.length);
    console.log('🌐 URL de prueba: http://localhost:3004/mi-registro/' + registration.registration_token);
    
    // Verificar en la base de datos
    const { data: verify } = await supabase
      .from('game_registrations')
      .select('registration_token, player_name')
      .eq('player_name', 'Juan Pérez Test')
      .single();
      
    console.log('🔍 Token en DB:', verify?.registration_token);
    console.log('🔍 Token en DB length:', verify?.registration_token?.length);

  } catch (error) {
    console.error('Error:', error);
  }
}

createTestData();