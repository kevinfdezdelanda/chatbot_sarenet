import json
import requests
from typing import Any
from llama_index.core.llms import CustomLLM, CompletionResponse, CompletionResponseGen, LLMMetadata
from llama_index.core.llms.callbacks import llm_completion_callback

API_URL = "http://172.26.215.178:1234/v1/chat/completions"
MODEL = "bartowski/c4ai-command-r-v01-GGUF"
TEMPERATURE = 0.4
MAX_TOKENS = -1

class CustomModel(CustomLLM):
    context_window: int = 3900
    num_output: int = 256
    model_name: str = "custom"
    api_url: str = API_URL
    model: str = MODEL
    temperature: float = TEMPERATURE
    max_tokens: int = MAX_TOKENS
    
    @property
    def metadata(self) -> LLMMetadata:
        return LLMMetadata(
            context_window=self.context_window,
            num_output=self.num_output,
            model_name=self.model_name,
        )

    def call_api(self, user, system="Follow instructions.", messages=None, stream=True):
        headers = {'Content-Type': 'application/json'}
        if messages is None:
            messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ]
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stream": stream
        }
        response = requests.post(self.api_url, json=data, headers=headers, stream=stream)
        if response.status_code == 200:
            if stream:
                return response.iter_lines()
            else:
                return response.json()
        else:
            raise Exception(f"Request failed with status code {response.status_code}")
        
    @llm_completion_callback()
    def complete(self, prompt: str, **kwargs: Any) -> CompletionResponse:
        response = self.call_api(prompt, stream=False)
        response_text = response['choices'][0]['message']['content']
        return CompletionResponse(text=response_text)
    
    @llm_completion_callback()
    def stream_complete(self, prompt: str, **kwargs: Any) -> CompletionResponseGen:
        response_gen = self.call_api(prompt, stream=True)
        complete_response = ""
        for chunk in response_gen:
            if chunk:
                data_str = chunk.decode('utf-8').replace('data: ', '')
                if data_str.strip() != '[DONE]':  # Check for completion message
                    try:
                        data = json.loads(data_str)
                        if 'choices' in data:
                            yield CompletionResponse(text=complete_response, delta='') # Arreglo para que muestre la primera letra
                            for choice in data['choices']:
                                partial_response = choice['delta']
                                if 'delta' in choice and 'content' in partial_response:
                                    complete_response += partial_response['content']
                                    yield CompletionResponse(text=complete_response, delta=partial_response['content'])
                    except json.JSONDecodeError as e:
                        yield CompletionResponse(text=complete_response, delta=f"Error parsing JSON: {str(e)}")
                else:
                    break  # Break the loop to end the stream

llm = CustomModel()
