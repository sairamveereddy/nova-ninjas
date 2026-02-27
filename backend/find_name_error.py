import ast
import os

def find_job_title_name_error(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        tree = ast.parse(f.read())

    class NameErrorVisitor(ast.NodeVisitor):
        def __init__(self):
            self.current_function = None
            self.defined_vars = set()
            self.errors = []

        def visit_FunctionDef(self, node):
            old_defined_vars = self.defined_vars.copy()
            self.current_function = node.name
            
            # Arguments are defined vars
            for arg in node.args.args:
                self.defined_vars.add(arg.arg)
            
            self.generic_visit(node)
            
            self.defined_vars = old_defined_vars
            self.current_function = None

        def visit_Assign(self, node):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    self.defined_vars.add(target.id)
                elif isinstance(target, ast.Tuple) or isinstance(target, ast.List):
                    for elt in target.elts:
                        if isinstance(elt, ast.Name):
                            self.defined_vars.add(elt.id)
            self.generic_visit(node)

        def visit_Name(self, node):
            if node.id == 'job_title' and isinstance(node.ctx, ast.Load):
                if node.id not in self.defined_vars:
                    self.errors.append((node.lineno, self.current_function))
            self.generic_visit(node)

    visitor = NameErrorVisitor()
    visitor.visit(tree)
    return visitor.errors

if __name__ == "__main__":
    target = r"c:\Users\vsair\Downloads\novasquar-main\novasquad-main\nova-ninjas\backend\document_generator.py"
    errors = find_job_title_name_error(target)
    for line, func in errors:
        print(f"Potential NameError: 'job_title' at line {line} in function {func}")
