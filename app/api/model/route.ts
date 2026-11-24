import { modelManifest } from '../../model';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(modelManifest);
}
