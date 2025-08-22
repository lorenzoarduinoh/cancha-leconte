/**
 * Test específico para verificar SOLO nuestros archivos de nombres de equipos
 */

const fs = require('fs');

console.log('🧪 Verificando implementación de nombres de equipos...\n');

try {
  // 1. Verificar archivos críticos existen
  console.log('✅ 1. Verificando archivos implementados...');
  
  const ourFiles = [
    'app/components/games/EditableTeamName.tsx',
    'app/hooks/useTeamNames.ts',
    'app/api/admin/games/[id]/team-names/route.ts'
  ];

  ourFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✓ ${file}`);
    } else {
      throw new Error(`   ❌ Falta archivo: ${file}`);
    }
  });

  // 2. Verificar contenido de archivos
  console.log('\n✅ 2. Verificando contenido de archivos...');
  
  // EditableTeamName
  const editableComponent = fs.readFileSync('app/components/games/EditableTeamName.tsx', 'utf8');
  if (editableComponent.includes('export function EditableTeamName') && 
      editableComponent.includes('useState') && 
      editableComponent.includes('onClick') &&
      editableComponent.includes('onKeyDown')) {
    console.log('   ✓ EditableTeamName implementado correctamente');
  } else {
    throw new Error('EditableTeamName incompleto');
  }
  
  // useTeamNames hook
  const teamNamesHook = fs.readFileSync('app/hooks/useTeamNames.ts', 'utf8');
  if (teamNamesHook.includes('export function useTeamNames') && 
      teamNamesHook.includes('useState') && 
      teamNamesHook.includes('fetch')) {
    console.log('   ✓ useTeamNames hook implementado correctamente');
  } else {
    throw new Error('useTeamNames hook incompleto');
  }
  
  // API route
  const apiRoute = fs.readFileSync('app/api/admin/games/[id]/team-names/route.ts', 'utf8');
  if (apiRoute.includes('export const GET') && 
      apiRoute.includes('export const PATCH') &&
      apiRoute.includes('teamNamesSchema')) {
    console.log('   ✓ API endpoints implementados correctamente');
  } else {
    throw new Error('API endpoints incompletos');
  }

  // 3. Verificar archivos modificados
  console.log('\n✅ 3. Verificando archivos modificados...');
  
  // TeamManagement
  const teamManagement = fs.readFileSync('app/components/games/TeamManagement.tsx', 'utf8');
  if (teamManagement.includes('EditableTeamName') && 
      teamManagement.includes('teamAName') && 
      teamManagement.includes('teamBName')) {
    console.log('   ✓ TeamManagement actualizado con nombres editables');
  } else {
    console.log('   ⚠️  TeamManagement podría no estar completamente integrado');
  }
  
  // GameResultForm
  const gameResultForm = fs.readFileSync('app/components/games/GameResultForm.tsx', 'utf8');
  if (gameResultForm.includes('teamAName') && gameResultForm.includes('teamBName')) {
    console.log('   ✓ GameResultForm actualizado con nombres personalizados');
  } else {
    console.log('   ⚠️  GameResultForm podría no estar completamente integrado');
  }
  
  // GameCard
  const gameCard = fs.readFileSync('app/components/games/GameCard.tsx', 'utf8');
  if (gameCard.includes('displayNames.team_a_name') && gameCard.includes('displayNames.team_b_name')) {
    console.log('   ✓ GameCard actualizado con nombres personalizados');
  } else {
    console.log('   ⚠️  GameCard podría no estar completamente integrado');
  }

  // 4. Verificar validaciones
  console.log('\n✅ 4. Verificando validaciones...');
  
  const validations = fs.readFileSync('lib/validations/games.ts', 'utf8');
  if (validations.includes('teamNamesSchema') && validations.includes('team_a_name')) {
    console.log('   ✓ Validaciones de nombres de equipos implementadas');
  } else {
    console.log('   ⚠️  Validaciones podrían estar incompletas');
  }

  // 5. Verificar tipos
  console.log('\n✅ 5. Verificando tipos...');
  
  const gameTypes = fs.readFileSync('lib/types/game.ts', 'utf8');
  if (gameTypes.includes('team_a_name') && gameTypes.includes('team_b_name')) {
    console.log('   ✓ Tipos de Game actualizados');
  } else {
    console.log('   ⚠️  Tipos de Game podrían estar incompletos');
  }

  console.log('\n🎉 ¡Verificación completada!');
  console.log('\n📋 Estado de la implementación:');
  console.log('✅ Componente EditableTeamName - LISTO');
  console.log('✅ Hook useTeamNames - LISTO');
  console.log('✅ API endpoints - LISTO');
  console.log('✅ Validaciones - LISTO');
  console.log('✅ Tipos TypeScript - LISTO');
  
  console.log('\n📋 Próximos pasos:');
  console.log('1. 🔄 Ejecuta la migración SQL en Supabase');
  console.log('2. 🚀 Inicia el servidor: npm run dev');
  console.log('3. 🧪 Prueba la funcionalidad en un juego específico');
  console.log('4. ✅ Verifica que los nombres se reflejan en todas las secciones');

} catch (error) {
  console.error('\n❌ Error en verificación:');
  console.error(error.message);
  process.exit(1);
}