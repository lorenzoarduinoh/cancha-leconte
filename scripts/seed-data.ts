const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sample data
const sampleGames = [
  // Partido de hoy - abierto para probar dashboard
  {
    title: 'Partido de Hoy - Tarde',
    description: 'Partido regular de fútbol 5 en la cancha principal',
    game_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // En 4 horas
    min_players: 8,
    max_players: 10,
    field_cost_per_player: 2500,
    status: 'open' as const,
  },
  // Partido de mañana - también abierto
  {
    title: 'Partido de Mañana - Noche',
    description: 'Partido nocturno bajo las luces',
    game_date: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(), // Mañana
    min_players: 8,
    max_players: 12,
    field_cost_per_player: 3000,
    status: 'open' as const,
  },
  // Partido del fin de semana - cerrado (lleno)
  {
    title: 'Clásico del Sábado',
    description: 'El partido más competitivo de la semana',
    game_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // En 3 días
    min_players: 10,
    max_players: 10,
    field_cost_per_player: 3500,
    status: 'closed' as const,
  },
  // Partido en progreso
  {
    title: 'Partido de Ahora - En Vivo',
    description: 'Partido que se está jugando ahora',
    game_date: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Hace 30 min
    min_players: 10,
    max_players: 10,
    field_cost_per_player: 2800,
    status: 'in_progress' as const,
  },
  // Partidos pasados - completados con pagos pendientes
  {
    title: 'Partido de Ayer',
    description: 'Partido ya jugado',
    game_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Ayer
    min_players: 8,
    max_players: 10,
    field_cost_per_player: 2000,
    status: 'completed' as const,
  },
  {
    title: 'Partido de la Semana Pasada',
    description: 'Partido con algunos pagos pendientes',
    game_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // Hace 5 días
    min_players: 8,
    max_players: 10,
    field_cost_per_player: 2200,
    status: 'completed' as const,
  },
  {
    title: 'Partido del Mes Pasado',
    description: 'Partido viejo para métricas mensuales',
    game_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // Hace 15 días
    min_players: 10,
    max_players: 12,
    field_cost_per_player: 1800,
    status: 'completed' as const,
  },
];

const samplePlayers = [
  { name: 'Santiago Pérez', phone: '+541141234567' },
  { name: 'Agustín García', phone: '+541142345678' },
  { name: 'Lucas Martínez', phone: '+541143456789' },
  { name: 'Diego López', phone: '+541144567890' },
  { name: 'Mateo Rodríguez', phone: '+541145678901' },
  { name: 'Benjamín González', phone: '+541146789012' },
  { name: 'Nicolás Fernández', phone: '+541147890123' },
  { name: 'Emiliano Silva', phone: '+541148901234' },
  { name: 'Valentín Romero', phone: '+541149012345' },
  { name: 'Thiago Morales', phone: '+541150123456' },
  { name: 'Joaquín Álvarez', phone: '+541151234567' },
  { name: 'Bruno Torres', phone: '+541152345678' },
  { name: 'Gael Flores', phone: '+541153456789' },
  { name: 'Ian Herrera', phone: '+541154567890' },
  { name: 'Lautaro Vargas', phone: '+541155678901' },
  { name: 'Tomás Castro', phone: '+541156789012' },
  { name: 'Franco Díaz', phone: '+541157890123' },
  { name: 'Maximiliano Ruiz', phone: '+541158901234' },
  { name: 'Sebastián Ramos', phone: '+541159012345' },
  { name: 'Facundo Mendoza', phone: '+541160123456' },
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // First, check if we already have the admin user
    const { data: existingAdmins } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1);
    
    if (!existingAdmins || existingAdmins.length === 0) {
      console.log('❌ No admin users found. Please run setup-admin-users.js first');
      return;
    }
    
    const adminUserId = existingAdmins[0].id;
    console.log('✅ Using admin user:', adminUserId);
    
    // Clear existing test data (optional - comment out if you want to keep existing data)
    console.log('🧹 Cleaning existing test data...');
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('game_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('game_registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Create sample games
    console.log('🏈 Creating sample games...');
    const { data: createdGames, error: gamesError } = await supabase
      .from('games')
      .insert(sampleGames.map(game => ({
        ...game,
        created_by: adminUserId,
        share_token: `test_token_${Math.random().toString(36).substring(7)}`,
      })))
      .select();
    
    if (gamesError) {
      console.error('Error creating games:', gamesError);
      return;
    }
    
    console.log(`✅ Created ${createdGames?.length} games`);
    
    // Create sample registrations for each game
    console.log('👥 Creating sample registrations...');
    let totalRegistrations = 0;
    
    for (const game of createdGames || []) {
      // Random number of players for each game (between min and a bit over min)
      const numPlayers = Math.min(
        game.min_players + Math.floor(Math.random() * 5),
        samplePlayers.length
      );
      
      const selectedPlayers = samplePlayers
        .sort(() => Math.random() - 0.5)
        .slice(0, numPlayers);
      
      const registrations = selectedPlayers.map((player, index) => {
        const isOldGame = new Date(game.game_date) < new Date();
        let paymentStatus: 'pending' | 'paid' | 'failed';
        let paidAt: string | null = null;
        
        if (isOldGame) {
          // Para partidos pasados, crear algunos pagos vencidos
          const rand = Math.random();
          if (rand < 0.25) {
            paymentStatus = 'pending'; // 25% vencidos para alertas
          } else if (rand < 0.95) {
            paymentStatus = 'paid'; // 70% pagados
            paidAt = new Date(Date.parse(game.game_date) - 24 * 60 * 60 * 1000).toISOString();
          } else {
            paymentStatus = 'failed'; // 5% fallidos
          }
        } else {
          // Para partidos futuros, mayoría pagados
          const rand = Math.random();
          if (rand < 0.15) {
            paymentStatus = 'pending'; // 15% pendientes
          } else {
            paymentStatus = 'paid'; // 85% pagados
            paidAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
          }
        }

        return {
          game_id: game.id,
          player_name: player.name,
          player_phone: player.phone,
          payment_status: paymentStatus,
          payment_amount: game.field_cost_per_player,
          team_assignment: game.status === 'completed' || game.status === 'in_progress'
            ? (index % 2 === 0 ? 'team_a' as const : 'team_b' as const)
            : null,
          registered_at: new Date(
            new Date(game.game_date).getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          paid_at: paidAt,
        };
      });
      
      const { data: createdRegistrations, error: regError } = await supabase
        .from('game_registrations')
        .insert(registrations)
        .select();
      
      if (regError) {
        console.error(`Error creating registrations for game ${game.title}:`, regError);
        continue;
      }
      
      totalRegistrations += createdRegistrations?.length || 0;
      
      // If game is completed, add results
      if (game.status === 'completed') {
        const teamAScore = Math.floor(Math.random() * 5);
        const teamBScore = Math.floor(Math.random() * 5);
        
        await supabase.from('game_results').insert({
          game_id: game.id,
          team_a_score: teamAScore,
          team_b_score: teamBScore,
          winning_team: teamAScore > teamBScore ? 'team_a' : teamBScore > teamAScore ? 'team_b' : 'draw',
          notes: 'Partido de prueba completado',
          recorded_by: adminUserId,
        });
        
        // Update game status
        await supabase
          .from('games')
          .update({
            teams_assigned_at: new Date().toISOString(),
            results_recorded_at: new Date().toISOString(),
          })
          .eq('id', game.id);
      }
    }
    
    console.log(`✅ Created ${totalRegistrations} registrations`);
    
    // Agregar algunas registraciones muy recientes para la actividad del dashboard
    console.log('📈 Adding recent activity...');
    
    // Buscar partidos abiertos para agregar actividad reciente
    const openGames = createdGames.filter((g: any) => g.status === 'open');
    
    if (openGames.length > 0) {
      const recentRegistrations = [
        {
          game_id: openGames[0].id,
          player_name: 'Franco Díaz',
          player_phone: '+541157890123',
          payment_status: 'paid' as const,
          payment_amount: openGames[0].field_cost_per_player,
          registered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Hace 2 horas
          paid_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        {
          game_id: openGames[Math.min(1, openGames.length - 1)].id,
          player_name: 'Maximiliano Ruiz',
          player_phone: '+541158901234',
          payment_status: 'pending' as const,
          payment_amount: openGames[Math.min(1, openGames.length - 1)].field_cost_per_player,
          registered_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // Hace 1 hora
        },
        {
          game_id: openGames[0].id,
          player_name: 'Sebastián Ramos',
          player_phone: '+541159012345',
          payment_status: 'paid' as const,
          payment_amount: openGames[0].field_cost_per_player,
          registered_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Hace 30 min
          paid_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        }
      ];

      for (const reg of recentRegistrations) {
        const { error: recentError } = await supabase
          .from('game_registrations')
          .insert([reg]);

        if (recentError) {
          console.error('Error creating recent activity:', recentError);
        }
      }
      
      console.log(`✅ Added ${recentRegistrations.length} recent activities`);
    }
    
    // Create sample notifications
    console.log('📱 Creating sample notifications...');
    const sampleNotifications = [];
    
    for (const game of createdGames || []) {
      // Get some registrations for this game
      const { data: gameRegistrations } = await supabase
        .from('game_registrations')
        .select('player_phone')
        .eq('game_id', game.id)
        .limit(3);
      
      if (gameRegistrations && gameRegistrations.length > 0) {
        for (const reg of gameRegistrations) {
          sampleNotifications.push({
            game_id: game.id,
            player_phone: reg.player_phone,
            message_type: 'game_reminder' as const,
            message_content: `Recordatorio: El partido "${game.title}" es mañana. ¡No te olvides!`,
            delivery_status: Math.random() > 0.2 ? 'delivered' as const : 'pending' as const,
            sent_at: Math.random() > 0.2 ? new Date().toISOString() : null,
            delivered_at: Math.random() > 0.2 ? new Date().toISOString() : null,
          });
        }
      }
    }
    
    if (sampleNotifications.length > 0) {
      const { data: createdNotifications, error: notifError } = await supabase
        .from('notifications')
        .insert(sampleNotifications.slice(0, 20)) // Limit to 20 notifications
        .select();
      
      if (notifError) {
        console.error('Error creating notifications:', notifError);
      } else {
        console.log(`✅ Created ${createdNotifications?.length} notifications`);
      }
    }
    
    // Create sample audit log entries
    console.log('📋 Creating sample audit log entries...');
    const auditEntries = [
      {
        admin_user_id: adminUserId,
        action_type: 'CREATE',
        entity_type: 'GAME',
        entity_id: createdGames?.[0]?.id,
        action_details: {
          title: createdGames?.[0]?.title,
          method: 'POST',
          success: true,
        },
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Test Browser)',
      },
      {
        admin_user_id: adminUserId,
        action_type: 'SEND_NOTIFICATION',
        entity_type: 'NOTIFICATION',
        action_details: {
          message_type: 'game_reminder',
          recipients_count: 5,
          method: 'POST',
          success: true,
        },
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Test Browser)',
      },
    ];
    
    const { data: createdAudit, error: auditError } = await supabase
      .from('admin_audit_log')
      .insert(auditEntries)
      .select();
    
    if (auditError) {
      console.error('Error creating audit entries:', auditError);
    } else {
      console.log(`✅ Created ${createdAudit?.length} audit log entries`);
    }
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Games: ${createdGames?.length}`);
    console.log(`   Registrations: ${totalRegistrations}`);
    console.log(`   Notifications: ${Math.min(sampleNotifications.length, 20)}`);
    console.log(`   Audit entries: ${createdAudit?.length || 0}`);
    
    console.log('\n🔗 Test the admin dashboard at: http://localhost:3000/admin/dashboard');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Add a cleanup function
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    await supabase.from('admin_audit_log').delete().ilike('user_agent', '%Test Browser%');
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('game_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('game_registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'cleanup') {
  cleanupTestData();
} else {
  seedDatabase();
}