import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext.js';
import { listOf } from '../api/collections';

/**
 * Segment rule fields and their types. The rule set is expressed in a
 * vendor-neutral DSL (`gte`, not `$gte`) because the API sanitiser strips
 * dollar-prefixed keys, and because a closed DSL is easier to validate than
 * a free-form Mongo filter.
 */
const FIELDS = [
  { key: 'totalSpend', label: 'Total Spend', type: 'number' },
  { key: 'totalOrders', label: 'Total Orders', type: 'number' },
  { key: 'lastOrderDate', label: 'Last Order Date', type: 'date' },
  { key: 'createdAt', label: 'Signup Date', type: 'date' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
];

const OPERATOR_TO_UI = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  eq: '=',
  ne: '!=',
};

const UI_TO_OPERATOR = {
  '>': 'gt',
  '>=': 'gte',
  '<': 'lt',
  '<=': 'lte',
  '=': 'eq',
  '!=': 'ne',
};

const fieldType = (key) => FIELDS.find((f) => f.key === key)?.type || 'text';

const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d) ? d.toISOString().split('T')[0] : null;
};

const RuleBlock = ({ block, index, onChange, onRemove }) => (
  <div className="flex gap-2 items-center flex-wrap">
    <select
      value={block.field}
      onChange={(e) => onChange(index, 'field', e.target.value)}
      className="p-2 border rounded"
    >
      {FIELDS.map((f) => (
        <option key={f.key} value={f.key}>
          {f.label}
        </option>
      ))}
    </select>

    <select
      value={block.operator}
      onChange={(e) => onChange(index, 'operator', e.target.value)}
      className="p-2 border rounded"
    >
      {Object.keys(UI_TO_OPERATOR).map((op) => (
        <option key={op} value={op}>
          {op}
        </option>
      ))}
    </select>

    <input
      type={fieldType(block.field) === 'date' ? 'date' : fieldType(block.field) === 'number' ? 'number' : 'text'}
      value={block.value}
      onChange={(e) => onChange(index, 'value', e.target.value)}
      placeholder="Value"
      className="p-2 border rounded w-40"
      min={fieldType(block.field) === 'number' ? 0 : undefined}
    />

    <button
      type="button"
      onClick={() => onRemove(index)}
      className="text-red-500 text-sm"
      aria-label="Remove rule"
    >
      ✖
    </button>
  </div>
);

const Loader = ({ text = 'Loading...' }) => (
  <div className="flex items-center">
    <div className="w-4 h-4 mr-2 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
    {text}
  </div>
);

const Campaigns = () => {
  const [form, setForm] = useState({
    name: '',
    message: '',
    segmentRules: '',
  });

  const [matchedUsers, setMatchedUsers] = useState([]);
  const [audienceTotal, setAudienceTotal] = useState(0);
  const [loading, setLoading] = useState({});
  const [isRulesEditable, setIsRulesEditable] = useState(false);
  const [ruleBlocks, setRuleBlocks] = useState([]);
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  /** Turns a rule set into the flat list of rule blocks the editor renders. */
  const updateRuleBlocksFromApiRule = useCallback((apiRule) => {
    const newBlocks = [];

    Object.entries(apiRule || {}).forEach(([field, conditions]) => {
      Object.entries(conditions || {}).forEach(([operator, value]) => {
        const uiOperator = OPERATOR_TO_UI[operator];
        if (!uiOperator) return;

        const formattedValue = fieldType(field) === 'date' ? formatDate(value) : value;

        newBlocks.push({
          field,
          operator: uiOperator,
          value: formattedValue,
        });
      });
    });

    setRuleBlocks(newBlocks);
  }, []);

  /** Turns the rule blocks back into the canonical rule set. */
  const convertToRuleObject = (blocks) => {
    const rule = {};

    blocks.forEach(({ field, operator, value }) => {
      if (!rule[field]) rule[field] = {};

      let parsedValue = value;
      const type = fieldType(field);
      if (type === 'number') {
        parsedValue = Number(value);
      } else if (type === 'date') {
        parsedValue = formatDate(value);
      }

      const apiOperator = UI_TO_OPERATOR[operator];
      if (apiOperator) rule[field][apiOperator] = parsedValue;
    });

    return rule;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRulesChange = (e) => {
    const newRulesJson = e.target.value;
    setForm({ ...form, segmentRules: newRulesJson });

    try {
      if (isRulesEditable && newRulesJson.trim()) {
        updateRuleBlocksFromApiRule(JSON.parse(newRulesJson));
      }
    } catch (err) {
      console.error('Invalid JSON format:', err);
      toast.error('Invalid JSON format. Please check your input.');
    }
  };

  const updateRuleBlocks = (updatedBlocks) => {
    setRuleBlocks(updatedBlocks);
    const ruleObject = convertToRuleObject(updatedBlocks);
    setForm((prev) => ({ ...prev, segmentRules: JSON.stringify(ruleObject, null, 2) }));
  };

  const handlePreview = async () => {
    if (!form.segmentRules.trim()) {
      toast.warning('Please define segment rules first');
      return;
    }

    setLoading((prev) => ({ ...prev, preview: true }));
    try {
      const rawRule = JSON.parse(form.segmentRules);
      // The audience is resolved by the API so the preview and the launch use
      // exactly the same query.
      const res = await axios.post('/campaigns/preview', { segmentRules: rawRule });
      const sample = listOf(res.data, 'sample');

      setMatchedUsers(sample);
      setAudienceTotal(res.data?.total ?? sample.length);
      toast.success(`Found ${res.data?.total ?? sample.length} matching customers`);
    } catch (err) {
      console.error('Preview error:', err);
      toast.error(err.response?.data?.message || 'Invalid segment rules. Please check your JSON syntax.');
    } finally {
      setLoading((prev) => ({ ...prev, preview: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim() || !form.segmentRules.trim()) {
      toast.warning('Please fill in all required fields');
      return;
    }

    if (!accessToken) {
      toast.error('User not authenticated');
      return;
    }

    setLoading((prev) => ({ ...prev, submit: true }));
    try {
      const rawRule = JSON.parse(form.segmentRules);
      const res = await axios.post('/campaigns', {
        name: form.name,
        message: form.message,
        subject: form.name,
        segmentRules: rawRule,
      });
      const { campaign } = res.data;

      /**
       * The recipient list is not sent from here. The server resolves the
       * audience from the campaign's own segment rules, so the browser
       * cannot decide who receives a campaign.
       */
      await axios.post('/logs/simulate', {
        campaignId: campaign._id,
        baseMessage: form.message,
      });

      toast.success('Campaign queued for delivery. Check campaign history for progress.');
      setForm({ name: '', message: '', segmentRules: '' });
      setMatchedUsers([]);
      setAudienceTotal(0);
      setRuleBlocks([]);
      navigate('/campaign-history');
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.response?.data?.message || 'Error creating campaign. Please check your inputs and try again.');
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handlePromptBlur = async (e) => {
    const prompt = e.target.value.trim();
    if (!prompt) return;

    setLoading((prev) => ({ ...prev, ai: true }));
    try {
      const res = await axios.post('/ai/segment', { prompt });

      if (res.data) {
        setForm((prev) => ({ ...prev, segmentRules: JSON.stringify(res.data, null, 2) }));
        updateRuleBlocksFromApiRule(res.data);
        toast.info('AI generated segment rules based on your description');
      }
    } catch (err) {
      console.error('AI error:', err);
      toast.error('AI failed to parse your prompt. Try being more specific.');
    } finally {
      setLoading((prev) => ({ ...prev, ai: false }));
    }
  };

  const generateMessageFromName = async () => {
    if (!form.name) {
      toast.warning('Please enter a campaign name first.');
      return;
    }

    setLoading((prev) => ({ ...prev, ai: true }));
    try {
      const res = await axios.post('/ai/messages', {
        context: `Generate promotional message for campaign: ${form.name}`,
      });

      if (res.data && res.data.messages) {
        const suggestions = res.data.messages.split('\n').filter(Boolean);
        if (suggestions.length > 0) {
          setForm((prev) => ({ ...prev, message: suggestions[0] }));
          toast.success('AI-generated message applied');
        } else {
          toast.warning('AI generated empty message. Please try again.');
        }
      }
    } catch (err) {
      console.error('Message generation error:', err);
      toast.error('Error generating campaign message');
    } finally {
      setLoading((prev) => ({ ...prev, ai: false }));
    }
  };

  const toggleRulesEditable = () => {
    setIsRulesEditable(!isRulesEditable);
    toast.info(isRulesEditable ? 'Segment rules locked' : 'Segment rules unlocked for editing');
  };

  const handleRuleBlockChange = (index, field, value) => {
    const updated = [...ruleBlocks];
    updated[index][field] = value;
    updateRuleBlocks(updated);
  };

  const addRuleBlock = () => {
    const updated = [...ruleBlocks, { field: 'totalSpend', operator: '>', value: 1000 }];
    updateRuleBlocks(updated);
  };

  const removeRuleBlock = (index) => {
    const updated = ruleBlocks.filter((_, i) => i !== index);
    updateRuleBlocks(updated);
  };

  // Keep the rule blocks in sync with the JSON whenever the rules are locked.
  useEffect(() => {
    if (!isRulesEditable && form.segmentRules.trim()) {
      try {
        updateRuleBlocksFromApiRule(JSON.parse(form.segmentRules));
      } catch (err) {
        console.error('Invalid JSON format:', err);
        toast.error('Invalid JSON format. Please check your input.');
      }
    }
  }, [isRulesEditable, form.segmentRules, updateRuleBlocksFromApiRule]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Campaign</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Name
              </label>
              <div className="flex gap-2">
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter a descriptive name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
                <button
                  type="button"
                  onClick={generateMessageFromName}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 whitespace-nowrap"
                  disabled={loading.ai}
                >
                  {loading.ai ? <Loader text="Generating" /> : (
                    <>
                      <span className="mr-1">✨</span> Generate Message
                    </>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Message
              </label>
              <textarea
                id="message"
                name="message"
                placeholder="Enter your promotional message"
                rows={3}
                value={form.message}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Target Audience
              </label>
              <div className="space-y-3">
                {ruleBlocks.length > 0 ? (
                  ruleBlocks.map((block, index) => (
                    <RuleBlock
                      key={index}
                      block={block}
                      index={index}
                      onChange={handleRuleBlockChange}
                      onRemove={removeRuleBlock}
                    />
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    No rules defined. Add a rule or use the AI-powered description below.
                  </div>
                )}

                <button
                  type="button"
                  onClick={addRuleBlock}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                >
                  <span className="mr-1">+</span> Add Rule
                </button>
              </div>
              <div className="space-y-2 mt-4">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <span className="mr-2">Describe Your Target Audience</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">AI Powered</span>
                </label>
                <div className="relative">
                  <textarea
                    placeholder="Example: Customers who spent more than 5000 rupees or made at least 3 orders"
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    onBlur={handlePromptBlur}
                  />
                  {loading.ai && (
                    <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center">
                      <Loader text="Generating rules..." />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Describe your target audience in plain English, and AI will convert it to segment rules.
                  Your description will be processed when you click outside the text box.
                </p>
              </div>
              <div className="mt-2">
                <div className="flex justify-between mb-1">
                  <label htmlFor="segmentRules" className="block text-xs text-gray-500">
                    Segment Rules (JSON)
                  </label>
                  <button
                    type="button"
                    onClick={toggleRulesEditable}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    {isRulesEditable ? 'Lock Rules' : 'Edit Rules'}
                  </button>
                </div>
                <textarea
                  id="segmentRules"
                  name="segmentRules"
                  rows={4}
                  value={form.segmentRules}
                  onChange={handleRulesChange}
                  className={`w-full p-2 border border-gray-300 rounded-md font-mono text-sm ${
                    !isRulesEditable ? 'bg-gray-50' : 'bg-white'
                  }`}
                  readOnly={!isRulesEditable}
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Operators are written without a dollar sign, for example{' '}
                  <code className="font-mono">{'{ "totalSpend": { "gte": 5000 } }'}</code>.
                </p>
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={handlePreview}
                className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-900 bg-yellow-100 hover:bg-yellow-200 flex items-center justify-center"
                disabled={loading.preview}
              >
                {loading.preview ? <Loader text="Previewing..." /> : 'Preview Audience'}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center"
                disabled={loading.submit}
              >
                {loading.submit ? <Loader text="Creating..." /> : 'Launch Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {matchedUsers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800">
              Preview Audience
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {audienceTotal} customer{audienceTotal === 1 ? '' : 's'}
              {audienceTotal > matchedUsers.length ? ` (showing ${matchedUsers.length})` : ''}
            </span>
          </div>
          <div className="overflow-y-auto max-h-64">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signup Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matchedUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{(user.totalSpend || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.totalOrders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastOrderDate ? new Date(user.lastOrderDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
