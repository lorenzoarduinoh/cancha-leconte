
INSERT INTO games (id, title, description, game_date, min_players, max_players, field_cost_per_player, game_duration_minutes, status) 
VALUES (
  gen_random_uuid(),
  'Partido de Prueba - Sábado',
  'Partido para testear el sistema de gestión personal',
  '2025-08-23 18:00:00+00',
  10,
  20,
  25.00,
  90,
  'active'
) ON CONFLICT DO NOTHING;

INSERT INTO game_registrations (id, game_id, player_name, player_phone, registered_at, payment_status, payment_amount, registration_token)
SELECT 
  gen_random_uuid(),
  g.id,
  'Juan Pérez',
  '+5491123456789',
  NOW(),
  'completed',
  25.00,
  encode(gen_random_bytes(32), 'hex')
FROM games g 
WHERE g.title = 'Partido de Prueba - Sábado'
LIMIT 1
ON CONFLICT DO NOTHING;

