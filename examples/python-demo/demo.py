#!/usr/bin/env python3
"""
TraceForge Demo App - Python Example

Demonstrates how to use TraceForge proxy with the OpenAI Python client.
"""

import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Configure OpenAI client to use local proxy
client = OpenAI(
    base_url=os.getenv('OPENAI_BASE_URL', 'http://localhost:8787/v1'),
    api_key=os.getenv('OPENAI_API_KEY'),
)


def main():
    print('🤖 TraceForge Demo App (Python)')
    print(f'📡 Using proxy: {client.base_url}')
    
    # Test 1: Regular completion
    print('\n--- Test 1: Regular Chat Completion ---\n')
    try:
        completion = client.chat.completions.create(
            model='gpt-3.5-turbo',
            messages=[
                {'role': 'system', 'content': 'You are a helpful assistant.'},
                {'role': 'user', 'content': 'Explain quantum computing in one sentence.'},
            ],
            temperature=0.7,
            max_tokens=100,
        )
        
        print('Response:', completion.choices[0].message.content)
        print('✅ Regular request successful!')
    except Exception as error:
        print(f'❌ Error: {error}')
    
    # Test 2: Streaming completion
    print('\n--- Test 2: Streaming Chat Completion ---\n')
    try:
        stream = client.chat.completions.create(
            model='gpt-3.5-turbo',
            messages=[
                {'role': 'system', 'content': 'You are a helpful assistant.'},
                {'role': 'user', 'content': 'Count from 1 to 5 slowly.'},
            ],
            temperature=0.7,
            max_tokens=50,
            stream=True,
        )
        
        full_content = ''
        print('Response: ', end='', flush=True)
        
        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                full_content += content
                print(content, end='', flush=True)
        
        print('\n✅ Streaming request successful!')
    except Exception as error:
        print(f'❌ Error: {error}')
    
    print('\n📊 Check .ai-tests/traces/ for captured traces')


if __name__ == '__main__':
    main()
