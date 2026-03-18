
const FormInput = ({
  type,
  name,
  value,
  onChange,
  label,
  error,
  required = false,
  rows = 3, // Default to 3 rows for textarea
}) => {
  const inputClasses =
    "peer w-full p-3 border-[1px] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300";
  const labelClasses =
    "absolute left-3 top-1 text-xs text-blue-700 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-tertiary peer-focus:top-1 peer-focus:text-xs peer-focus:text-blue-700 font-semibold";

  return (
    <div className="mb-4 relative">
      {type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={rows}
          className={`${inputClasses} ${error ? "border-red-500" : "border-grayLight"}`}
          placeholder=" "
          required={required}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className={`${inputClasses} ${error ? "border-red-500" : "border-grayLight"}`}
          placeholder=" "
          required={required}
        />
      )}
      <label htmlFor={name} className={labelClasses}>
        {label}
      </label>
    </div>
  );
};

export default FormInput;
