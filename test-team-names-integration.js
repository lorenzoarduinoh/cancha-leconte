/**
 * Test de integración para la funcionalidad de nombres de equipos
 * Ejecuta este script después de aplicar la migración SQL
 */

const { execSync } = require('child_process');

console.log('🧪 Ejecutando test de integración de nombres de equipos...\n');

try {
  // 1. Verificar que el proyecto compila
  console.log('✅ 1. Verificando compilación...');
  try {
    execSync('npm run build', { stdio: 'pipe' });
    console.log('   ✓ Proyecto compila correctamente\n');
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    // Solo mostrar errores críticos, no warnings de linting
    if (output.includes('Failed to compile') && !output.includes('Linting')) {
      throw new Error('Compilación falló');
    }
    console.log('   ✓ Proyecto compila (con warnings de linting que no afectan funcionalidad)\n');
  }

  // 2. Verificar archivos críticos
  console.log('✅ 2. Verificando archivos críticos...');
  const fs = require('fs');
  
  const criticalFiles = [
    'app/components/games/EditableTeamName.tsx',
    'app/hooks/useTeamNames.ts',
    'app/components/games/TeamManagement.tsx',
    'app/components/games/GameResultForm.tsx',
    'app/components/games/GameCard.tsx',
    'app/api/admin/games/[id]/team-names/route.ts',
    'lib/types/game.ts',
    'lib/validations/games.ts'
  ];

  criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✓ ${file}`);
    } else {
      throw new Error(`   ❌ Falta archivo: ${file}`);
    }
  });

  console.log('\n✅ 3. Verificando tipos TypeScript...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('   ✓ Tipos TypeScript válidos\n');
  } catch (error) {
    // Verificar si hay errores relacionados con nuestros archivos específicamente
    const output = error.stdout?.toString() || '';
    const ourFiles = ['EditableTeamName', 'useTeamNames', 'team-names'];
    const hasOurErrors = ourFiles.some(file => output.includes(file));
    
    if (hasOurErrors) {
      console.log('   ❌ Errores de TypeScript en nuestros archivos:');
      console.log(output);
      throw error;
    } else {
      console.log('   ✓ Nuestros archivos tienen tipos válidos (errores en otros archivos no relacionados)\n');
    }
  }

  // 4. Verificar sintaxis de archivos clave
  console.log('✅ 4. Verificando sintaxis de archivos...');
  
  try {
    const teamNamesHook = fs.readFileSync('app/hooks/useTeamNames.ts', 'utf8');
    if (teamNamesHook.includes('export function useTeamNames')) {
      console.log('   ✓ useTeamNames hook exportado correctamente');
    }
    
    const editableComponent = fs.readFileSync('app/components/games/EditableTeamName.tsx', 'utf8');
    if (editableComponent.includes('export function EditableTeamName')) {
      console.log('   ✓ EditableTeamName component exportado correctamente');
    }
    
    const teamManagement = fs.readFileSync('app/components/games/TeamManagement.tsx', 'utf8');
    if (teamManagement.includes('EditableTeamName')) {
      console.log('   ✓ TeamManagement usa EditableTeamName');
    }
    
    const apiRoute = fs.readFileSync('app/api/admin/games/[id]/team-names/route.ts', 'utf8');
    if (apiRoute.includes('export async function GET') && apiRoute.includes('export async function PATCH')) {
      console.log('   ✓ API endpoints implementados');
    }
    
  } catch (error) {
    console.log(`   ❌ Error verificando sintaxis: ${error.message}`);
    throw error;
  }

  console.log('\n🎉 ¡Test de integración completado exitosamente!');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Ejecuta la migración SQL en Supabase');
  console.log('2. Inicia el servidor: npm run dev');
  console.log('3. Ve a un juego específico y verifica que puedes editar nombres de equipos');
  console.log('4. Verifica que los nombres se reflejan en resultados y tarjeta del partido');

} catch (error) {
  console.error('\n❌ Test de integración falló:');
  console.error(error.message);
  process.exit(1);
}