"""
ISL Sequence Classifier ONNX / TF.js Web Exporter
Exports trained PyTorch / Keras dynamic sequence classifiers to ONNX format for zero-overhead Web browser execution via ONNX.js / WebGL.
"""

def export_to_onnx(model, output_path="isl_dynamic_gru.onnx", sequence_length=30, feature_dim=126):
    try:
        import torch
        dummy_input = torch.randn(1, sequence_length, feature_dim, requires_grad=False)
        
        torch.onnx.export(
            model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=['sequence_input'],
            output_names=['class_probabilities'],
            dynamic_axes={
                'sequence_input': {0: 'batch_size'},
                'class_probabilities': {0: 'batch_size'}
            }
        )
        print(f"Successfully exported model to ONNX: {output_path}")
    except ImportError:
        print("[Notice] PyTorch not found. ONNX export script template configured.")

if __name__ == '__main__':
    print("ISL ONNX Web Export script ready.")
