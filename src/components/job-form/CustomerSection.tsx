import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AsyncSelect from 'react-select/async';
import { searchCustomers, createCustomer, Customer as CustomerType } from "@/services/customers";
import { QuickCreateModal } from "@/components/QuickCreateModal";
import { Customer } from "@/hooks/useDropdownData";

interface CustomerSectionProps {
  value: string;
  onChange: (value: string) => void;
  customers: Customer[];
  clientName?: string;
  onClientNameChange?: (value: string) => void;
  onCustomerNameChange?: (value: string) => void;
}

export function CustomerSection({ value, onChange, customers, clientName, onClientNameChange, onCustomerNameChange }: CustomerSectionProps) {
  const CASH_CUSTOMER_ID = "00000000-0000-0000-0000-000000000001";
  const isCashCustomer = value === CASH_CUSTOMER_ID;
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<{ value: string; label: string } | null>(null);

  useEffect(() => {
    const customer = customers.find(c => c.id === value);
    if (customer) {
      setSelectedOption({ value: customer.id, label: customer.name });
    }
  }, [value, customers]);

  const loadOptions = (inputValue: string, callback: (options: any[]) => void) => {
    if (inputValue.length < 2) {
      callback([]);
      return;
    }
    
    setTimeout(async () => {
      try {
        const results = await searchCustomers(inputValue);
        callback(results.map(c => ({ value: c.id, label: c.name })));
      } catch (error) {
        callback([]);
      }
    }, 300);
  };

  const handleCreate = async (name: string): Promise<{ id: string; name: string }> => {
    const newCustomer = await createCustomer(name);
    onChange(newCustomer.id);
    onCustomerNameChange?.(newCustomer.name);
    setSelectedOption({ value: newCustomer.id, label: newCustomer.name });
    return { id: newCustomer.id, name: newCustomer.name };
  };

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: 'hsl(var(--input))',
      backgroundColor: 'hsl(var(--background))',
      borderRadius: '0.375rem',
      minHeight: '2.5rem',
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      zIndex: 50,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'hsl(var(--accent))' : 'transparent',
      color: 'hsl(var(--foreground))',
    }),
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="customer">Customer *</Label>
        <div className="flex gap-2">
          <AsyncSelect
            className="flex-1"
            inputId="customer"
            styles={customStyles}
            value={selectedOption}
            loadOptions={loadOptions}
            onChange={(option) => {
              onChange(option?.value || '');
              onCustomerNameChange?.(option?.label || '');
              setSelectedOption(option);
            }}
            placeholder="Type to search customer..."
            isClearable
          />
          <Button 
            type="button"
            variant="outline" 
            size="icon" 
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <QuickCreateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Create Customer"
        label="Customer Name"
        placeholder="Enter customer name"
        onSave={handleCreate}
      />

      {isCashCustomer && onClientNameChange && (
        <div>
          <Label htmlFor="clientName">Client Name</Label>
          <Input
            id="clientName"
            placeholder="Enter client name"
            value={clientName || ''}
            onChange={(e) => onClientNameChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
