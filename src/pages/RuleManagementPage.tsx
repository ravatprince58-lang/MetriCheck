
import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  ShieldCheck,
  Lock,
  Search,
  BookOpen,
  Eye,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

/* =========================================================
   LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011
   Fixed rules + locally added rules
   No database / no Supabase
   ========================================================= */

type MetrologyRuleSeverity = 'mandatory' | 'warning' | 'info';

interface MetrologyRule2011 {
  id: string;
  ruleCode: string;
  ruleNumber: string;
  title: string;
  description: string;
  legalReference: string;
  severity: MetrologyRuleSeverity;
  requiredFields: string[];
  applicableTo: string[];
  active: boolean;
}

/* =========================================================
   FIXED PREDEFINED RULES
   These rules cannot be deleted from the application.
   ========================================================= */

const METROLOGY_RULES_2011: MetrologyRule2011[] = [
  {
    id: 'LM-PC-2011-001',
    ruleCode: 'LM-PC-R6-01',
    ruleNumber: 'Rule 6(1)(a)',
    title: 'Manufacturer / Packer / Importer Details',
    description:
      'The package must carry the name and address of the manufacturer. Where the manufacturer is not the packer, the manufacturer and packer details are required. For imported packages, the importer name and address must be declared.',
    legalReference:
      'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(a)',
    severity: 'mandatory',
    requiredFields: ['manufacturer', 'address'],
    applicableTo: [
      'Electrical',
      'Mechanical',
      'Textile',
      'Food & Beverage',
      'Pharmaceutical',
      'Chemical',
      'Construction',
      'Other',
    ],
    active: true,
  },

  {
    id: 'LM-PC-2011-002',
    ruleCode: 'LM-PC-R6-01-B',
    ruleNumber: 'Rule 6(1)(b)',
    title: 'Imported Product Information',
    description:
      'Imported packages must carry the applicable importer identification and address information required by the rules.',
    legalReference:
      'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6',
    severity: 'mandatory',
    requiredFields: ['manufacturer', 'address'],
    applicableTo: [
      'Electrical',
      'Mechanical',
      'Textile',
      'Food & Beverage',
      'Pharmaceutical',
      'Chemical',
      'Construction',
      'Other',
    ],
    active: true,
  },

  {
    id: 'LM-PC-2011-003',
    ruleCode: 'LM-PC-R6-02',
    ruleNumber: 'Rule 6',
    title: 'Common / Generic Name of Commodity',
    description:
      'The package should clearly identify the common or generic name of the commodity so that the nature of the product is identifiable.',
    legalReference:
      'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6',
    severity: 'mandatory',
    requiredFields: ['product_name'],
    applicableTo: [
      'Electrical',
      'Mechanical',
      'Textile',
      'Food & Beverage',
      'Pharmaceutical',
      'Chemical',
      'Construction',
      'Other',
    ],
    active: true,
  },

  {
    id: 'LM-PC-2011-004',
    ruleCode: 'LM-PC-R6-03',
    ruleNumber: 'Rule 6',
    title: 'Net Quantity',
    description:
      'The package must declare the net quantity of the commodity in the prescribed unit of weight, measure or number, as applicable.',
    legalReference:
      'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6',
    severity: 'mandatory',
    requiredFields: ['net_quantity'],
    applicableTo: [
      'Electrical',
      'Mechanical',
      'Textile',
      'Food & Beverage',
      'Pharmaceutical',
      'Chemical',
      'Construction',
      'Other',
    ],
    active: true,
  },

  {
    id: 'LM-PC-2011-005',
    ruleCode: 'LM-PC-R6-04',
    ruleNumber: 'Rule 6',
    title: 'Retail Sale Price / MRP',
    description:
      'The maximum retail sale price, inclusive of all taxes as applicable under the rules, must be declared in the prescribed manner.',
    legalReference:
      'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6',
    severity: 'mandatory',
    requiredFields: ['mrp'],
    applicableTo: [
      'Electrical',
      'Mechanical',
      'Textile',
      'Food & Beverage',
      'Pharmaceutical',
      'Chemical',
      'Construction',
      'Other',
    ],
    active: true,
  },

  {
    id: 'LM-PC-2011-006',
    ruleCode: 'LM-PC-R6-05',
    ruleNumber: 'Rule 6',
    title: 'Manufacturing / Packing Date',
    description:
      'The relevant month and year of manufacture, packing or import should be declared where required by the applicable provisions.',
    legalReference:
      'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6',
    severity: 'mandatory',
    requiredFields: ['manufacturing_date'],
    applicableTo: [
      'Electrical',
      'Mechanical',
      'Textile',
      'Food & Beverage',
      'Pharmaceutical',
      'Chemical',
      'Construction',
      'Other',
    ],
    active: true,
  },

  {
    id: 'LM-PC-2011-007',
    ruleCode: 'LM-PC-R6-06',
    ruleNumber: 'Rule 6',
    title: 'Consumer Care Information',
    description:
      'The package must provide the prescribed consumer complaint / consumer care contact information where applicable.',
    legalReference:
      'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6',
    severity: 'mandatory',
    requiredFields: ['consumer_care'],
    applicableTo: [
      'Electrical',
      'Mechanical',
      'Textile',
      'Food & Beverage',
      'Pharmaceutical',
      'Chemical',
      'Construction',
      'Other',
    ],
    active: true,
  },

  {
    id: 'LM-PC-2011-008',
    ruleCode: 'LM-PC-R6-07',
    ruleNumber: 'Rule 6',
    title: 'Package Declarations Must Be Clear',
    description:
      'Mandatory declarations on the package must be definite, plain and conspicuous and made in accordance with the applicable provisions.',
    legalReference:
      'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)',
    severity: 'mandatory',
    requiredFields: [
      'product_name',
      'net_quantity',
      'mrp',
      'manufacturer',
      'address',
    ],
    applicableTo: [
      'Electrical',
      'Mechanical',
      'Textile',
      'Food & Beverage',
      'Pharmaceutical',
      'Chemical',
      'Construction',
      'Other',
    ],
    active: true,
  },

  {
    id: 'LM-PC-2011-009',
    ruleCode: 'LM-PC-R5-01',
    ruleNumber: 'Rule 5',
    title: 'Standard Pack Size',
    description:
      'Commodities specified in the Second Schedule are required to be packed and sold in the prescribed standard quantities. Where applicable, non-standard pack declarations are required.',
    legalReference:
      'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 5',
    severity: 'mandatory',
    requiredFields: ['net_quantity'],
    applicableTo: [
      'Electrical',
      'Mechanical',
      'Textile',
      'Food & Beverage',
      'Pharmaceutical',
      'Chemical',
      'Construction',
      'Other',
    ],
    active: true,
  },

  {
    id: 'LM-PC-2011-010',
    ruleCode: 'LM-PC-R6-08',
    ruleNumber: 'Rule 6',
    title: 'Barcode / Identification',
    description:
      'Where a barcode or other identification is used for product verification, the decoded information should correspond with the package information.',
    legalReference:
      'Legal Metrology (Packaged Commodities) Rules, 2011 - Package identification requirements',
    severity: 'warning',
    requiredFields: ['barcode'],
    applicableTo: [
      'Electrical',
      'Mechanical',
      'Textile',
      'Food & Beverage',
      'Pharmaceutical',
      'Chemical',
      'Construction',
      'Other',
    ],
    active: true,
  },
];

/* =========================================================
   LOCAL STORAGE
   ========================================================= */

const CUSTOM_RULES_STORAGE_KEY = 'metricheck_custom_rules';

/* =========================================================
   HELPERS
   ========================================================= */

function loadCustomRules(): MetrologyRule2011[] {
  try {
    const storedRules = localStorage.getItem(CUSTOM_RULES_STORAGE_KEY);

    if (!storedRules) {
      return [];
    }

    const parsedRules = JSON.parse(storedRules);

    if (!Array.isArray(parsedRules)) {
      return [];
    }

    return parsedRules;
  } catch {
    return [];
  }
}

function saveCustomRules(rules: MetrologyRule2011[]) {
  localStorage.setItem(
    CUSTOM_RULES_STORAGE_KEY,
    JSON.stringify(rules)
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export function RuleManagementPage() {
  const [search, setSearch] = useState('');
  const [selectedRule, setSelectedRule] =
    useState<MetrologyRule2011 | null>(null);

  const [customRules, setCustomRules] =
    useState<MetrologyRule2011[]>(() => loadCustomRules());

  const [showAddModal, setShowAddModal] = useState(false);

  const [deleteRule, setDeleteRule] =
    useState<MetrologyRule2011 | null>(null);

  const [newRule, setNewRule] = useState({
    ruleCode: '',
    ruleNumber: '',
    title: '',
    description: '',
    legalReference: '',
    severity: 'mandatory' as MetrologyRuleSeverity,
    requiredFields: '',
    applicableTo: '',
  });

  /* =======================================================
     ALL RULES
     ======================================================= */

  const allRules = useMemo(() => {
    return [...METROLOGY_RULES_2011, ...customRules];
  }, [customRules]);

  /* =======================================================
     SEARCH
     ======================================================= */

  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return allRules;
    }

    return allRules.filter((rule) => {
      const searchableText = [
        rule.ruleCode,
        rule.ruleNumber,
        rule.title,
        rule.description,
        rule.legalReference,
        ...rule.requiredFields,
        ...rule.applicableTo,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [search, allRules]);

  /* =======================================================
     STATISTICS
     ======================================================= */

  const mandatoryCount = allRules.filter(
    (rule) => rule.severity === 'mandatory'
  ).length;

  const warningCount = allRules.filter(
    (rule) => rule.severity === 'warning'
  ).length;

  const activeCount = allRules.filter(
    (rule) => rule.active
  ).length;

  /* =======================================================
     ADD RULE
     ======================================================= */

  const handleAddRule = () => {
    if (
      !newRule.ruleCode.trim() ||
      !newRule.ruleNumber.trim() ||
      !newRule.title.trim() ||
      !newRule.description.trim() ||
      !newRule.legalReference.trim()
    ) {
      alert('Please fill all required fields.');
      return;
    }

    const duplicateCode = allRules.some(
      (rule) =>
        rule.ruleCode.toLowerCase() ===
        newRule.ruleCode.trim().toLowerCase()
    );

    if (duplicateCode) {
      alert('A rule with this Rule Code already exists.');
      return;
    }

    const rule: MetrologyRule2011 = {
      id: `CUSTOM-${Date.now()}`,
      ruleCode: newRule.ruleCode.trim(),
      ruleNumber: newRule.ruleNumber.trim(),
      title: newRule.title.trim(),
      description: newRule.description.trim(),
      legalReference: newRule.legalReference.trim(),
      severity: newRule.severity,
      requiredFields: newRule.requiredFields
        .split(',')
        .map((field) => field.trim())
        .filter(Boolean),
      applicableTo: newRule.applicableTo
        .split(',')
        .map((category) => category.trim())
        .filter(Boolean),
      active: true,
    };

    const updatedRules = [...customRules, rule];

    setCustomRules(updatedRules);
    saveCustomRules(updatedRules);

    setNewRule({
      ruleCode: '',
      ruleNumber: '',
      title: '',
      description: '',
      legalReference: '',
      severity: 'mandatory',
      requiredFields: '',
      applicableTo: '',
    });

    setShowAddModal(false);
  };

  /* =======================================================
     DELETE CUSTOM RULE
     ======================================================= */

  const handleDeleteRule = () => {
    if (!deleteRule) {
      return;
    }

    const updatedRules = customRules.filter(
      (rule) => rule.id !== deleteRule.id
    );

    setCustomRules(updatedRules);
    saveCustomRules(updatedRules);

    if (selectedRule?.id === deleteRule.id) {
      setSelectedRule(null);
    }

    setDeleteRule(null);
  };

  /* =======================================================
     CHECK IF RULE IS CUSTOM
     ======================================================= */

  const isCustomRule = (rule: MetrologyRule2011) => {
    return customRules.some(
      (customRule) => customRule.id === rule.id
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Rule Management
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Legal Metrology (Packaged Commodities) Rules, 2011
                </p>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex flex-wrap items-center gap-3">

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Add New Rule
            </button>

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
              <Lock className="h-4 w-4 text-gray-500" />

              <span className="text-sm font-medium text-gray-600">
                Fixed Rules
              </span>
            </div>

          </div>
        </div>

        {/* Information */}
        <Card>
          <CardBody>
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />

              <div>
                <h2 className="font-semibold text-gray-900">
                  Legal Metrology Compliance Rules
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-600">
                  The predefined Legal Metrology rules are protected
                  application rules. Additional custom rules can be
                  created from this page and are stored locally in
                  this browser.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Total Rules
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {allRules.length}
                  </p>
                </div>

                <ShieldCheck className="h-7 w-7 text-blue-500" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Mandatory Rules
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {mandatoryCount}
                  </p>
                </div>

                <Badge variant="error">
                  Mandatory
                </Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Active Rules
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {activeCount}
                  </p>
                </div>

                <Badge variant="default">
                  Active
                </Badge>
              </div>
            </CardBody>
          </Card>

        </div>

        {/* Search */}
        <Card>
          <CardBody>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by rule number, title, legal reference..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </CardBody>
        </Card>

        {/* Rule List */}
        <Card>
          <CardBody className="p-0">

            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Compliance Rules
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {filteredRules.length} rule
                    {filteredRules.length !== 1 ? 's' : ''} displayed
                  </p>
                </div>

                {warningCount > 0 && (
                  <Badge variant="warning">
                    {warningCount} Warning
                    {warningCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            {filteredRules.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Search className="mx-auto h-10 w-10 text-gray-300" />

                <h3 className="mt-3 text-sm font-semibold text-gray-900">
                  No rules found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Try changing your search term.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">

                {filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="px-6 py-5 transition hover:bg-gray-50"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                      <div className="min-w-0 flex-1">

                        {/* Rule number + badges */}
                        <div className="flex flex-wrap items-center gap-2">

                          <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-700">
                            {rule.ruleCode}
                          </span>

                          <span className="text-sm font-semibold text-gray-900">
                            {rule.ruleNumber}
                          </span>

                          {rule.severity === 'mandatory' && (
                            <Badge variant="error">
                              Mandatory
                            </Badge>
                          )}

                          {rule.severity === 'warning' && (
                            <Badge variant="warning">
                              Warning
                            </Badge>
                          )}

                          {rule.severity === 'info' && (
                            <Badge variant="default">
                              Information
                            </Badge>
                          )}

                          {rule.active && (
                            <Badge variant="default">
                              Active
                            </Badge>
                          )}

                          {isCustomRule(rule) && (
                            <Badge variant="default">
                              Custom
                            </Badge>
                          )}

                        </div>

                        {/* Title */}
                        <h3 className="mt-3 text-base font-semibold text-gray-900">
                          {rule.title}
                        </h3>

                        {/* Description */}
                        <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
                          {rule.description}
                        </p>

                        {/* Legal reference */}
                        <div className="mt-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            Legal Reference
                          </p>

                          <p className="mt-1 text-sm text-gray-700">
                            {rule.legalReference}
                          </p>
                        </div>

                        {/* Applicable categories */}
                        <div className="mt-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            Applicable To
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {rule.applicableTo.map((category) => (
                              <span
                                key={category}
                                className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Actions */}
                      <div className="flex flex-shrink-0 items-center gap-2">

                        {/* View */}
                        <button
                          type="button"
                          onClick={() => setSelectedRule(rule)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>

                        {/* Delete - only for custom rules */}
                        {isCustomRule(rule) && (
                          <button
                            type="button"
                            onClick={() => setDeleteRule(rule)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        )}

                      </div>

                    </div>
                  </div>
                ))}

              </div>
            )}

          </CardBody>
        </Card>

        {/* Information Notice */}
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
          <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500" />

          <div>
            <p className="text-sm font-medium text-gray-800">
              Predefined rules are protected
            </p>

            <p className="mt-1 text-sm text-gray-600">
              The original Legal Metrology rules included with
              MetriCheck cannot be deleted. Only custom rules added
              through this page can be deleted.
            </p>
          </div>
        </div>

      </div>

      {/* =====================================================
          RULE DETAILS MODAL
          ===================================================== */}

      <Modal
        open={selectedRule !== null}
        onClose={() => setSelectedRule(null)}
        title={
          selectedRule
            ? `${selectedRule.ruleNumber} - ${selectedRule.title}`
            : 'Rule Details'
        }
      >
        {selectedRule && (
          <div className="space-y-5">

            {/* Code */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Rule Code
              </p>

              <p className="mt-1 font-mono text-sm font-semibold text-gray-800">
                {selectedRule.ruleCode}
              </p>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Description
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-700">
                {selectedRule.description}
              </p>
            </div>

            {/* Legal reference */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Legal Reference
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-700">
                {selectedRule.legalReference}
              </p>
            </div>

            {/* Severity */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Severity
              </p>

              <div className="mt-2">
                {selectedRule.severity === 'mandatory' && (
                  <Badge variant="error">
                    Mandatory
                  </Badge>
                )}

                {selectedRule.severity === 'warning' && (
                  <Badge variant="warning">
                    Warning
                  </Badge>
                )}

                {selectedRule.severity === 'info' && (
                  <Badge variant="default">
                    Information
                  </Badge>
                )}
              </div>
            </div>

            {/* Required fields */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Required Fields
              </p>

              {selectedRule.requiredFields.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedRule.requiredFields.map((field) => (
                    <span
                      key={field}
                      className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  No specific fields listed.
                </p>
              )}
            </div>

            {/* Applicable categories */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Applicable Categories
              </p>

              {selectedRule.applicableTo.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedRule.applicableTo.map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  No categories specified.
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Status
              </p>

              <div className="mt-2">
                <Badge variant="default">
                  {selectedRule.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Custom rule indicator */}
            {isCustomRule(selectedRule) && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm font-medium text-blue-800">
                  Custom Rule
                </p>

                <p className="mt-1 text-sm text-blue-700">
                  This rule was added through the Rule Management
                  page and is stored locally in this browser.
                </p>
              </div>
            )}

            {/* Close */}
            <div className="flex justify-end border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setSelectedRule(null)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Close
              </button>
            </div>

          </div>
        )}
      </Modal>

      {/* =====================================================
          ADD NEW RULE MODAL
          ===================================================== */}

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Rule"
      >
        <div className="space-y-5">

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm font-medium text-blue-800">
              Add Custom Compliance Rule
            </p>

            <p className="mt-1 text-sm text-blue-700">
              This rule will be stored locally in this browser.
              It will not modify the predefined Legal Metrology
              rules or the database.
            </p>
          </div>

          {/* Rule Code */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Rule Code <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={newRule.ruleCode}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  ruleCode: e.target.value,
                })
              }
              placeholder="Example: CUSTOM-R6-01"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Rule Number */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Rule Number <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={newRule.ruleNumber}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  ruleNumber: e.target.value,
                })
              }
              placeholder="Example: Rule 7"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Rule Title <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={newRule.title}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  title: e.target.value,
                })
              }
              placeholder="Enter rule title"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>

            <textarea
              value={newRule.description}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  description: e.target.value,
                })
              }
              placeholder="Enter rule description"
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Legal Reference */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Legal Reference <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={newRule.legalReference}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  legalReference: e.target.value,
                })
              }
              placeholder="Example: Legal Metrology Rules - Rule 7"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Severity
            </label>

            <select
              value={newRule.severity}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  severity:
                    e.target.value as MetrologyRuleSeverity,
                })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="mandatory">
                Mandatory
              </option>

              <option value="warning">
                Warning
              </option>

              <option value="info">
                Information
              </option>
            </select>
          </div>

          {/* Required Fields */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Required Fields
            </label>

            <input
              type="text"
              value={newRule.requiredFields}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  requiredFields: e.target.value,
                })
              }
              placeholder="Example: mrp, net_quantity, manufacturer"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Separate multiple fields with commas.
            </p>
          </div>

          {/* Applicable To */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Applicable To
            </label>

            <input
              type="text"
              value={newRule.applicableTo}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  applicableTo: e.target.value,
                })
              }
              placeholder="Example: Food & Beverage, Electrical"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Separate multiple categories with commas.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">

            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>

            <button
              type="button"
              onClick={handleAddRule}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Add Rule
            </button>

          </div>

        </div>
      </Modal>

      {/* =====================================================
          DELETE CONFIRMATION MODAL
          ===================================================== */}

      <Modal
        open={deleteRule !== null}
        onClose={() => setDeleteRule(null)}
        title="Delete Rule"
      >
        {deleteRule && (
          <div className="space-y-5">

            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-4">

              <Trash2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />

              <div>
                <p className="text-sm font-semibold text-red-800">
                  Delete this custom rule?
                </p>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  This action will permanently remove the custom
                  rule from this browser's local storage.
                </p>
              </div>

            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">

              <p className="font-mono text-xs font-semibold text-gray-600">
                {deleteRule.ruleCode}
              </p>

              <p className="mt-1 text-base font-semibold text-gray-900">
                {deleteRule.title}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {deleteRule.ruleNumber}
              </p>

            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">

              <button
                type="button"
                onClick={() => setDeleteRule(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteRule}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Rule
              </button>

            </div>

          </div>
        )}
      </Modal>

    </AdminLayout>
  );
}

export default RuleManagementPage;

