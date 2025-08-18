import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError, 
  validateQueryParams,
  withErrorHandling,
  createPaginationMeta
} from '../../../../lib/utils/api';
import { 
  paginationSchema 
} from '../../../../lib/validations/games';
import { auditService } from '../../../../lib/services/audit';

// GET /api/admin/audit - Get audit log entries
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  // Validate query parameters
  const { data: params, error: paramsError } = validateQueryParams(
    searchParams,
    paginationSchema.extend({
      admin_user_id: paginationSchema.shape.page.optional().transform(val => val?.toString()),
      action_type: paginationSchema.shape.page.optional().transform(val => val?.toString()),
      entity_type: paginationSchema.shape.page.optional().transform(val => val?.toString()),
      entity_id: paginationSchema.shape.page.optional().transform(val => val?.toString()),
      date_from: paginationSchema.shape.page.optional().transform(val => val?.toString()),
      date_to: paginationSchema.shape.page.optional().transform(val => val?.toString()),
    })
  );
  
  if (paramsError) {
    return paramsError;
  }
  
  const { page, limit, ...filters } = params;
  const offset = (page - 1) * limit;
  
  try {
    const { entries, total } = await auditService.getAuditLog({
      ...filters,
      limit,
      offset,
    });
    
    const pagination = createPaginationMeta(total, page, limit);
    
    const response = {
      data: entries,
      total,
      page,
      limit,
      hasMore: pagination.hasMore,
    };
    
    return createApiResponse(response, 'Registros de auditoría obtenidos');
    
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return createApiError('Error al obtener registros de auditoría', 500);
  }
});

// POST /api/admin/audit/report - Generate audit report
export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { date_from, date_to, admin_user_id } = body;
    
    if (!date_from || !date_to) {
      return createApiError('Fechas de inicio y fin son requeridas', 400);
    }
    
    const report = await auditService.generateReport({
      dateFrom: date_from,
      dateTo: date_to,
      adminUserId: admin_user_id,
    });
    
    return createApiResponse(report, 'Reporte de auditoría generado');
    
  } catch (error) {
    console.error('Error generating audit report:', error);
    return createApiError('Error al generar reporte de auditoría', 500);
  }
});