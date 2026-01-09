PLPGSQL RPC Coding Conventions

Casing
General: Use underscore format (snake_case) for all identifiers.

SQL Keywords: Use UPPERCASE for all SQL keywords.

Variable Naming
Input Variables: Prefix with input

Function Variables: Prefix with var

Return Variable: Always use return_data

Alias: Use the table name as the alias in queries

Comments
Add comments for complex conditions (optional).

Search Path
SET search_path TO '';

Sample Array Declaration
To extract UUID arrays from JSON input:

array_variable UUID[] := ARRAY(SELECT jsonb_array_elements_text((input_data->'array_variable')::JSONB) )::UUID[];
Sample Input Variable Destructuring
Use the following format to destructure input variables:

DECLARE  
 input_text_value TEXT := (input_data->>'text_value')::TEXT;  
 input_uuid_value UUID := (input_data->>'uuid_value')::UUID;  
 input_integer_value INTEGER := (input_data->>'integer_value')::INTEGER;  
 input_conditional_text_value TEXT := COALESCE((input_data->>'input_conditional_text_value')::TEXT, NULL);  
 input_conditional_integer_value INTEGER := COALESCE((input_data->>'input_conditional_integer_value')::INTEGER, NULL);

RPC Format
All functions should follow this structure:

CREATE OR REPLACE FUNCTION <function_name>(input_data JSON)
RETURNS <data_type>
SET search_path TO ''
SECURITY DEFINER -- (optional, add only if required by PRC logic)
AS $$
DECLARE  
 -- Input variables  
 <list of input variables>  
 -- Function variables  
 <list of function variables>  
 -- Return variable  
 return_data <data_type>;
BEGIN  
 <function logic>
END;

$$
LANGUAGE plpgsql;
Condition Conventions
Array Length Check:

IF array_length(<variable>, 1) > 0 THEN
  creator_condition := format('AND form_team_member_id = ANY(%L)', creator);
END IF;
Query WHERE Condition Format Example

condition := format('AND <column_name> ILIKE %L', '%' || search || '%');
JSON Handling
Convert all JSON to JSONB where possible.

If changing an RPC argument type from JSON → JSONB, ensure all dependent RPCs that call or use it are updated accordingly.
$$
