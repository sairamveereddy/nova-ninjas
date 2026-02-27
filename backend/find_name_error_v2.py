import ast
import os

def find_job_title_name_error(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            tree = ast.parse(f.read())
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        return []

    class NameErrorVisitor(ast.NodeVisitor):
        def __init__(self):
            self.current_function = None
            self.defined_vars = set()
            self.errors = []
            # Add common globals
            self.defined_vars.update(['str', 'int', 'dict', 'list', 'set', 'tuple', 'bool', 'Exception', 'print', 'len', 'enumerate', 'range', 'min', 'max', 'sum', 'any', 'all', 'isinstance', 'hasattr', 'setattr', 'getattr', 'locals', 'globals', 'vars', 'dir', 'id', 'type', 'isinstance', 'issubclass', 'callable', 'iter', 'next', 'round', 'pow', 'abs', 'divmod', 'bin', 'oct', 'hex', 'chr', 'ord', 'bytearray', 'bytes', 'memoryview', 'slice', 'frozenset', 'help', 'input', 'open', 'repr', 'sorted', 'reversed', 'format', 'ascii', 'compile', 'eval', 'exec', 'property', 'staticmethod', 'classmethod', 'super', 'zip', 'map', 'filter', 'object', 'None', 'True', 'False'])

        def visit_FunctionDef(self, node):
            old_defined_vars = self.defined_vars.copy()
            self.current_function = node.name
            
            # Arguments are defined vars
            for arg in node.args.args:
                self.defined_vars.add(arg.arg)
            if node.args.vararg:
                self.defined_vars.add(node.args.vararg.arg)
            if node.args.kwarg:
                self.defined_vars.add(node.args.kwarg.arg)
            for arg in node.args.kwonlyargs:
                self.defined_vars.add(arg.arg)
            
            self.generic_visit(node)
            
            self.defined_vars = old_defined_vars
            self.current_function = None

        def visit_AsyncFunctionDef(self, node):
            self.visit_FunctionDef(node)

        def visit_Assign(self, node):
            for target in node.targets:
                self._add_to_defined(target)
            self.generic_visit(node)

        def _add_to_defined(self, node):
            if isinstance(node, ast.Name):
                self.defined_vars.add(node.id)
            elif isinstance(node, (ast.Tuple, ast.List)):
                for elt in node.elts:
                    self._add_to_defined(elt)

        def visit_Import(self, node):
            for name in node.names:
                self.defined_vars.add(name.asname or name.name.split('.')[0])
            self.generic_visit(node)

        def visit_ImportFrom(self, node):
            for name in node.names:
                self.defined_vars.add(name.asname or name.name)
            self.generic_visit(node)

        def visit_Name(self, node):
            if node.id == 'job_title' and isinstance(node.ctx, ast.Load):
                if node.id not in self.defined_vars:
                    # Double check if it's a global we missed
                    self.errors.append((node.lineno, self.current_function))
            self.generic_visit(node)

    visitor = NameErrorVisitor()
    visitor.visit(tree)
    return visitor.errors

if __name__ == "__main__":
    backend_dir = r"c:\Users\vsair\Downloads\novasquar-main\novasquad-main\nova-ninjas\backend"
    for root, dirs, files in os.walk(backend_dir):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                errors = find_job_title_name_error(filepath)
                for line, func in errors:
                    print(f"Potential NameError: 'job_title' at {filepath}:{line} in function {func}")
