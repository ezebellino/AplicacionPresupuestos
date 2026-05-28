import type { Dispatch, FormEvent, SetStateAction } from 'react';

import Swal from 'sweetalert2';

import {
  apiClient,
  type TenantChangeRequest,
  type TenantChangeRequestPayload,
  type TenantProfile,
  type TenantProfilePayload,
} from '../../shared/api/client';
import { companyProfileToForm, showSuccessToast } from './dashboardUtils';
import { nullable } from './helpers';
import { emptyTenantLegalChangeForm } from './state';
import type { CompanyProfileForm, TenantLegalChangeForm } from './types';

type CreateCompanyProfileActionHandlersArgs = {
  companyProfileForm: CompanyProfileForm;
  setCompanyProfile: Dispatch<SetStateAction<TenantProfile | null>>;
  setCompanyProfileForm: Dispatch<SetStateAction<CompanyProfileForm>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setTenantChangeRequests: Dispatch<SetStateAction<TenantChangeRequest[]>>;
  setTenantLegalChangeForm: Dispatch<SetStateAction<TenantLegalChangeForm>>;
  tenantLegalChangeForm: TenantLegalChangeForm;
};

type CompanyProfileActionHandlers = {
  handleCompanyProfileSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleTenantLegalChangeSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function createCompanyProfileActionHandlers({
  companyProfileForm,
  setCompanyProfile,
  setCompanyProfileForm,
  setIsSaving,
  setTenantChangeRequests,
  setTenantLegalChangeForm,
  tenantLegalChangeForm,
}: CreateCompanyProfileActionHandlersArgs): CompanyProfileActionHandlers {
  const handleCompanyProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const payload: TenantProfilePayload = {
      address: nullable(companyProfileForm.address),
      phone: nullable(companyProfileForm.phone),
      email: nullable(companyProfileForm.email),
      website: nullable(companyProfileForm.website),
      logo_url: nullable(companyProfileForm.logo_url),
      invoice_notes: nullable(companyProfileForm.invoice_notes),
      default_tax_rate: nullable(companyProfileForm.default_tax_rate),
    };

    try {
      const updatedProfile = await apiClient.updateTenantProfile(payload);
      setCompanyProfile(updatedProfile);
      setCompanyProfileForm(companyProfileToForm(updatedProfile));
      await Swal.fire({
        title: 'Perfil actualizado',
        text: 'Los datos de empresa ya estan disponibles para impresiones y facturas.',
        icon: 'success',
        confirmButtonText: 'Cerrar',
      });
    } catch {
      await Swal.fire({
        title: 'No se pudo guardar el perfil',
        text: 'Revisa los datos e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTenantLegalChangeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: TenantChangeRequestPayload = {
      proposed_name: nullable(tenantLegalChangeForm.proposed_name),
      proposed_legal_name: nullable(tenantLegalChangeForm.proposed_legal_name),
      proposed_tax_id: nullable(tenantLegalChangeForm.proposed_tax_id),
      reason: nullable(tenantLegalChangeForm.reason),
    };

    if (!payload.proposed_name && !payload.proposed_legal_name && !payload.proposed_tax_id) {
      await Swal.fire({
        title: 'Faltan datos',
        text: 'Indica al menos un cambio fiscal para enviar la solicitud.',
        icon: 'warning',
        confirmButtonText: 'Cerrar',
      });
      return;
    }

    setIsSaving(true);

    try {
      const request = await apiClient.createTenantChangeRequest(payload);
      setTenantChangeRequests((current) => [request, ...current]);
      setTenantLegalChangeForm(emptyTenantLegalChangeForm);
      showSuccessToast('Solicitud enviada');
    } catch {
      await Swal.fire({
        title: 'No se pudo enviar la solicitud',
        text: 'Revisa los datos e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    handleCompanyProfileSubmit,
    handleTenantLegalChangeSubmit,
  };
}
