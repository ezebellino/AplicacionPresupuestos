import type { Dispatch, FormEvent, SetStateAction } from 'react';

import Swal from 'sweetalert2';

import {
  apiClient,
  type CostItem,
  type CostItemPayload,
  type ExpenseCategory,
  type ExpenseEntry,
  type ExpenseEntryPayload,
  type ExpenseStatus,
} from '../../shared/api/client';
import { escapeHtml, showSuccessToast } from './dashboardUtils';
import { nullable } from './helpers';
import { emptyCostForm, emptyExpenseForm } from './state';
import type { CostForm, ExpenseForm, View } from './types';

type CreateCostExpenseActionHandlersArgs = {
  costForm: CostForm;
  editingCostId: string | null;
  expenseCategories: ExpenseCategory[];
  expenseForm: ExpenseForm;
  loadWorkspace: () => Promise<void>;
  setActiveView: Dispatch<SetStateAction<View>>;
  setCostForm: Dispatch<SetStateAction<CostForm>>;
  setEditingCostId: Dispatch<SetStateAction<string | null>>;
  setExpenseForm: Dispatch<SetStateAction<ExpenseForm>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
};

type CostExpenseActionHandlers = {
  deleteCost: (item: CostItem) => Promise<void>;
  editCost: (item: CostItem) => void;
  handleCostSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleExpenseStatusChange: (entry: ExpenseEntry, status: ExpenseStatus) => Promise<void>;
  handleExpenseSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleManageExpenseCategories: () => Promise<void>;
};

export function createCostExpenseActionHandlers({
  costForm,
  editingCostId,
  expenseCategories,
  expenseForm,
  loadWorkspace,
  setActiveView,
  setCostForm,
  setEditingCostId,
  setExpenseForm,
  setIsSaving,
}: CreateCostExpenseActionHandlersArgs): CostExpenseActionHandlers {
  const handleCostSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: CostItemPayload = {
      category: 'services',
      name: costForm.name.trim(),
      description: nullable(costForm.description),
      unit: 'servicio',
      unit_cost: costForm.unit_cost,
      tax_rate: nullable(costForm.tax_rate),
    };

    if (!payload.name || !payload.unit_cost) {
      await Swal.fire({
        title: 'Faltan datos del servicio',
        text: 'Carga el nombre del servicio y el precio antes de guardar.',
        icon: 'warning',
        confirmButtonText: 'Cerrar',
      });
      return;
    }

    setIsSaving(true);

    try {
      const wasEditing = Boolean(editingCostId);
      if (editingCostId) {
        await apiClient.updateCostItem(editingCostId, payload);
      } else {
        await apiClient.createCostItem(payload);
      }

      setCostForm(emptyCostForm);
      setEditingCostId(null);
      await loadWorkspace();
      showSuccessToast(wasEditing ? 'Servicio actualizado' : 'Servicio creado');
    } catch {
      await Swal.fire({
        title: 'No se pudo guardar el servicio',
        text: 'Revisa importe, unidad e IVA. El IVA vacio usa el valor general de la empresa.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExpenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!expenseForm.amount || !expenseForm.detail.trim()) {
      await Swal.fire({
        title: 'Faltan datos del gasto',
        text: 'Completa monto y detalle para registrar el gasto.',
        icon: 'warning',
        confirmButtonText: 'Cerrar',
      });
      return;
    }

    const payload: ExpenseEntryPayload = {
      amount: expenseForm.amount,
      detail: expenseForm.detail.trim(),
      notes: nullable(expenseForm.notes),
      status: expenseForm.status,
      client_id: expenseForm.client_id || null,
      category_id: expenseForm.category_id || null,
    };

    setIsSaving(true);
    try {
      await apiClient.createExpenseEntry(payload);
      setExpenseForm(emptyExpenseForm);
      await loadWorkspace();
      showSuccessToast('Gasto registrado');
    } catch {
      await Swal.fire({
        title: 'No se pudo registrar el gasto',
        text: 'Revisa el monto, detalle y los datos opcionales antes de intentar nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExpenseStatusChange = async (entry: ExpenseEntry, status: ExpenseStatus) => {
    setIsSaving(true);
    try {
      await apiClient.updateExpenseEntry(entry.id, { status });
      await loadWorkspace();
      showSuccessToast(status === 'paid' ? 'Gasto marcado como cobrado' : 'Gasto marcado como pendiente');
    } catch {
      await Swal.fire({
        title: 'No se pudo actualizar el gasto',
        text: 'Intenta nuevamente en unos segundos.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManageExpenseCategories = async () => {
    const currentCategories = expenseCategories
      .map((category) => `<li style="margin:0 0 6px;">${escapeHtml(category.name)}</li>`)
      .join('');

    const result = await Swal.fire({
      title: 'Administrar categorias',
      html: `
        <div style="display:grid;gap:12px;text-align:left;">
          <div>
            <strong style="display:block;margin-bottom:8px;">Categorias actuales</strong>
            <ul style="margin:0;padding-left:18px;color:#64748b;">
              ${currentCategories || '<li>Sin categorias cargadas</li>'}
            </ul>
          </div>
          <label style="display:grid;gap:6px;">
            <span>Nueva categoria</span>
            <input id="expense-category-name" class="swal2-input" placeholder="Ej. Materiales de stock" style="margin:0;" />
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Agregar categoria',
      cancelButtonText: 'Cerrar',
      preConfirm: () => {
        const nameValue = (document.getElementById('expense-category-name') as HTMLInputElement | null)?.value.trim() ?? '';
        if (!nameValue) {
          Swal.showValidationMessage('Escribe un nombre para la categoria.');
          return undefined;
        }
        return { name: nameValue };
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.createExpenseCategory(result.value);
      await loadWorkspace();
      showSuccessToast('Categoria creada');
    } catch {
      await Swal.fire({
        title: 'No se pudo crear la categoria',
        text: 'Intenta nuevamente con otro nombre.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const editCost = (item: CostItem) => {
    setEditingCostId(item.id);
    setCostForm({
      category: item.category,
      name: item.name,
      description: item.description ?? '',
      unit: item.unit,
      unit_cost: item.unit_cost,
      tax_rate: item.tax_rate ?? '',
    });
    setActiveView('costs');
  };

  const deleteCost = async (item: CostItem) => {
    const result = await Swal.fire({
      title: `Desactivar ${item.name}`,
      text: 'El costo no se usara para nuevos presupuestos, pero mantiene el historial.',
      icon: 'warning',
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await apiClient.deleteCostItem(item.id);
      await loadWorkspace();
      showSuccessToast('Servicio desactivado');
    } catch {
      await Swal.fire({
        title: 'No se pudo desactivar el servicio',
        text: 'Revisa que tu sesion siga vigente e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  };

  return {
    deleteCost,
    editCost,
    handleCostSubmit,
    handleExpenseStatusChange,
    handleExpenseSubmit,
    handleManageExpenseCategories,
  };
}
