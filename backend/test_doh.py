import dns.message
import dns.query
import ssl

def test_doh():
    q = dns.message.make_query('www.pornhub.com', 'A')
    where = 'https://cloudflare-dns.com/dns-query'
    with ssl.create_default_context() as ssl_context:
        try:
            response = dns.query.https(q, where, timeout=5)
            for answer in response.answer:
                print(answer)
        except Exception as e:
            print(f"DoH failed: {e}")

if __name__ == "__main__":
    test_doh()
